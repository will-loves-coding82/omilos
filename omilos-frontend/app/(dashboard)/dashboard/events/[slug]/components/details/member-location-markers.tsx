"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Marker } from "react-map-gl/mapbox";
import { useAuth } from "@clerk/nextjs";
import { events, type EventsChannel } from "aws-amplify/data";
import type { ClientEventMember } from "@/app/types/client-types";

// Separate namespace from the server-published "events" channel: clients publish here
// directly, so it gets its own onPublish handler (sender must match the JWT's sub).
const LOCATIONS_NAMESPACE = "locations";
export const locationChannelName = (eventId: number) => `/${LOCATIONS_NAMESPACE}/${eventId}`;

// Unlike the "events" channel, these messages carry the data itself: they're frequent,
// and a missed one doesn't matter because the next update replaces it.
export type LocationMessage =
  | { type: "location"; clerkId: string; lat: number; lng: number; at: number }
  | { type: "location_stopped"; clerkId: string };

type MemberLocation = { lat: number; lng: number; receivedAt: number };

const PUBLISH_INTERVAL_MS = 30_000;  // publish our latest position every 30s
const STALE_AFTER_MS = 2 * 60_000;   // drop markers not updated for this long (~4 missed publishes)
const MAX_RETRY_DELAY_MS = 30_000;

function isLocationMessage(value: unknown): value is LocationMessage {
  if (typeof value !== "object" || value === null) return false;
  const msg = value as Record<string, unknown>;
  if (typeof msg.clerkId !== "string") return false;
  if (msg.type === "location_stopped") return true;
  return msg.type === "location" && typeof msg.lat === "number" && typeof msg.lng === "number";
}

/**
 * Publishes the current user's location (while `isSharing`) and renders the live
 * locations of other event members. Must be rendered inside a react-map-gl <Map>.
 * Kept as its own component so frequent location updates only re-render the markers.
 */
export default function MemberLocationMarkers({
  eventId,
  members,
  isSharing,
}: {
  eventId: number;
  members: ClientEventMember[];
  isSharing: boolean;
}) {
  const { getToken, isSignedIn, userId } = useAuth();
  const [locations, setLocations] = useState<Record<string, MemberLocation>>({});

  // The subscribed channel, shared with the publish effect. Null while (re)connecting.
  const channelRef = useRef<EventsChannel | null>(null);

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Subscribe: receive other members' locations
  useEffect(() => {
    if (!isSignedIn || !userId || !process.env.NEXT_PUBLIC_APPSYNC_EVENTS_ENDPOINT) return;

    let cancelled = false;
    let channel: EventsChannel | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const scheduleRetry = () => {
      if (cancelled) return;
      clearTimeout(retryTimer);
      const delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
    };

    async function connect() {
      channel?.close();
      channel = undefined;
      channelRef.current = null;

      try {
        const token = await getTokenRef.current();
        if (cancelled) return;
        if (!token) return scheduleRetry();

        const ch = await events.connect(locationChannelName(eventId), {
          authMode: "oidc",
          authToken: token,
        });
        if (cancelled) {
          ch.close();
          return;
        }
        channel = ch;

        const subscription = ch.subscribe({
          next: ({ event }: { event: unknown }) => {
            if (!isLocationMessage(event) || event.clerkId === userId) return;

            if (event.type === "location_stopped") {
              setLocations((prev) => {
                const next = { ...prev };
                delete next[event.clerkId];
                return next;
              });
              return;
            }

            // Staleness uses our receive time, not the sender's clock, to avoid clock skew.
            setLocations((prev) => ({
              ...prev,
              [event.clerkId]: { lat: event.lat, lng: event.lng, receivedAt: Date.now() },
            }));
          },
          error: (err) => {
            console.error("[locations] subscription error", err);
            scheduleRetry();
          },
        });

        await subscription.ready;
        attempt = 0;
        channelRef.current = ch;
      } catch (err) {
        if (cancelled) return;
        console.error("[locations] failed to connect", err);
        scheduleRetry();
      }
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      channelRef.current = null;
      channel?.close();
    };
  }, [eventId, isSignedIn, userId]);

  // Publish: share our own location every 30s while isSharing is on
  useEffect(() => {
    if (!isSharing || !userId || !navigator.geolocation) return;

    let latest: { lat: number; lng: number } | null = null; // most recent GPS fix
    let hasPublished = false;                               // true once one publish succeeds
    let inFlight = false;                                   // prevents overlapping publishes

    // Send with a fresh token every time: a publish over the socket otherwise reuses the
    // token the channel was opened with, which expires after ~60s.
    const send = async (message: LocationMessage) => {
      const ch = channelRef.current;
      if (!ch) return false;
      const token = await getTokenRef.current();
      if (!token) return false;
      await ch.publish(message, { authMode: "oidc", authToken: token });
      return true;
    };

    const publishLatest = async () => {
      if (!latest || inFlight) return;
      inFlight = true;
      try {
        const { lat, lng } = latest;
        const sent = await send({ type: "location", clerkId: userId, lat, lng, at: Date.now() });
        if (sent) hasPublished = true;
      } catch (err) {
        console.error("[locations] publish failed", err);
      } finally {
        inFlight = false;
      }
    };

    // watchPosition keeps `latest` current; the interval sends whatever the newest fix is.
    // The very first fix is published immediately so others don't wait 30s to see us.
    // If the channel isn't ready yet, that send is skipped and the interval picks it up.
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        latest = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!hasPublished) publishLatest();
      },
      (err) => console.error("[locations] geolocation error", err),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );

    const publishTimer = setInterval(publishLatest, PUBLISH_INTERVAL_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(publishTimer);
      // Tell others to remove our marker right away instead of waiting for it to go stale
      if (hasPublished) {
        send({ type: "location_stopped", clerkId: userId }).catch(() => {});
      }
    };
  }, [isSharing, userId]);

  // Remove markers for members who stopped sending without a "location_stopped" (closed the tab, lost signal)
  useEffect(() => {
    const pruneTimer = setInterval(() => {
      const cutoff = Date.now() - STALE_AFTER_MS;
      setLocations((prev) => {
        const fresh = Object.fromEntries(Object.entries(prev).filter(([, loc]) => loc.receivedAt >= cutoff));
        return Object.keys(fresh).length === Object.keys(prev).length ? prev : fresh;
      });
    }, 30_000);
    return () => clearInterval(pruneTimer);
  }, []);

  return (
    <>
      {Object.entries(locations).map(([clerkId, loc]) => {
        // Only render known members of this event
        const member = members.find((m) => m.user.clerk_id === clerkId);
        if (!member) return null;
        const name = `${member.user.first_name} ${member.user.last_name}`.trim() || member.user.username;

        return (
          <Marker key={clerkId} longitude={loc.lng} latitude={loc.lat} anchor="center">
            <div
              title={name}
              className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-white shadow-md overflow-hidden bg-bg-tertiary text-text-primary text-sm font-medium"
            >
              {member.user.image_url ? (
                <Image src={member.user.image_url} alt={name} width={36} height={36} className="rounded-full" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
