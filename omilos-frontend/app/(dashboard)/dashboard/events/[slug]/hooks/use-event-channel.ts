"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { events, type EventsChannel } from "aws-amplify/data";
import { eventKey, membersKey, stopsKey } from "@/app/providers/query-keys";
import { eventChannelName, type EventChannelMessage, type RoleChangedMessage } from "@/app/types/realtime-types";

const MAX_RETRY_DELAY_MS = 30_000;

type EventChannelOptions = {
  // Called for every role change in this event; the caller decides if it's about them
  onRoleChanged?: (message: RoleChangedMessage) => void;
};

/**
 * Subscribes to the real-time channel for an event and invalidates the
 * matching React Query caches when other members change something.
 */
export function useEventChannel(eventId: number, slug: string, options: EventChannelOptions = {}) {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  // Clerk may hand a new getToken function on re-render
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const onRoleChangedRef = useRef(options.onRoleChanged);
  useEffect(() => {
    onRoleChangedRef.current = options.onRoleChanged;
  }, [options.onRoleChanged]);

  useEffect(() => {
    if (!isSignedIn || !process.env.NEXT_PUBLIC_APPSYNC_EVENTS_ENDPOINT) return

    let cancelled = false
    let channel: EventsChannel | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let hasConnected = false

    // Map message types to the React Query keys they affect (one change can touch several caches)
    const keysFor = (type: EventChannelMessage["type"] | undefined): QueryKey[] => {
      switch (type) {
        case "event": return [eventKey(slug)]
        case "stops": return [stopsKey(eventId)]
        case "stop_deleted": return [stopsKey(eventId), eventKey(slug)] // may clear active_stop_id
        case "members": return [membersKey(eventId)]
        case "role": return [membersKey(eventId)] // roles are shown in the member list
        default: return []
      }
    }

    const pending = new Map<string, QueryKey>()

    const flush = () => {
      for (const key of pending.values()) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      pending.clear()
    }

    // Each WebSocket message would normally invalidate its query straight away.
    // While one of our own mutations is in flight, that refetch could return data from
    // before the write committed and overwrite the optimistic update. So invalidations
    // are held in `pending` (deduplicated by key) and flushed once no mutations are running.
    const invalidate = (key: QueryKey) => {
      pending.set(JSON.stringify(key), key)
      if (queryClient.isMutating() === 0) flush()
    }

    // Cleanup function when this hook unmounts
    const unsubscribeMutations = queryClient.getMutationCache().subscribe(() => {
      if (pending.size > 0 && queryClient.isMutating() === 0) flush()
    })

    // Retry with exponential falloff
    const scheduleRetry = () => {
      if (cancelled) return
      clearTimeout(retryTimer)
      const delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS)
      attempt += 1
      retryTimer = setTimeout(connect, delay)
    }


    const connect = async () => {
      channel?.close()
      channel = undefined

      try {
        const token = await getTokenRef.current();
        if (cancelled) return
        if (!token) return scheduleRetry();

        const ch = await events.connect(eventChannelName(eventId), { authMode: "oidc", authToken: token })
        if (cancelled) {
          ch.close()
          return
        }

        channel = ch

        const subscription = ch.subscribe({
          next: ({ event }: { event: EventChannelMessage }) => {
            for (const key of keysFor(event?.type)) invalidate(key)
            if (event?.type === "role") onRoleChangedRef.current?.(event)
          },
          error: (err) => {
            console.error("events subscription error", err)
            scheduleRetry()
          }
        })

        await subscription.ready
        attempt = 0

        if (hasConnected) {
          invalidate(eventKey(slug))
          invalidate(stopsKey(eventId))
          invalidate(membersKey(eventId))
        }

        hasConnected = true
      }
      catch (error) {
        if (cancelled) return
        console.error("events failed to connect", error)
        scheduleRetry()
      }
    }


    connect()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      unsubscribeMutations()
      channel?.close()
    }

  }, [eventId, slug, isSignedIn, queryClient]);
}
