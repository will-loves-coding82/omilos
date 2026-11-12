"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Search, UserRound, X } from "lucide-react";
import clsx from "clsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientEventMember, ClientUser } from "@/app/types/client-types";
import { searchUsers } from "@/app/actions/user-actions";
import { inviteEventMember } from "@/app/actions/event-actions";
import { membersKey } from "@/app/providers/query-keys";

type InviteMembersModalProps = {
  eventId: number;
  members: ClientEventMember[];
  isOpen: boolean;
  onClose: () => void;
};

// Guards against fake/malformed image_url values (e.g. seed data) that would
// otherwise reach next/image and throw.
function isValidImageUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    return new URL(url).hostname === "img.clerk.com";
  } catch {
    return false;
  }
}

export function InviteMembersModal({ eventId, members, isOpen, onClose }: InviteMembersModalProps) {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClientUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(new Set());

  // Reset the modal each time it's closed
  useEffect(() => {
    if (isOpen) return;
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSearchResults([]);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedSearchQuery) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    searchUsers(debouncedSearchQuery)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          setError(res.message ?? "Failed to search users");
          return;
        }
        setError(null);
        setSearchResults(res.data.users);
      })
      .catch(() => !cancelled && setError("Failed to search users"))
      .finally(() => !cancelled && setIsSearching(false));

    return () => { cancelled = true; };
  }, [debouncedSearchQuery]);

  const inviteMtn = useMutation({
    mutationFn: async (user: ClientUser) => {
      const res = await inviteEventMember(eventId, user.id);
      if (!res.success) throw new Error(res.message ?? "Failed to invite user");
    },
    // Optimistically add the user as a pending member so the button flips to "Pending" immediately
    onMutate: async (user) => {
      setError(null);
      await queryClient.cancelQueries({ queryKey: membersKey(eventId) });
      const previous = queryClient.getQueryData<ClientEventMember[]>(membersKey(eventId));
      const now = new Date().toISOString();
      queryClient.setQueryData<ClientEventMember[]>(membersKey(eventId), (old = []) => [
        ...old.filter((m) => m.user.id !== user.id),
        { user, rsvp_status: "pending", member_role: "viewer", status_updated_at: now, created_at: now },
      ]);
      return { previous };
    },
    onError: (err, _user, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(membersKey(eventId), ctx.previous);
      setError(err instanceof Error ? err.message : "Failed to invite user");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(eventId) });
    },
  });

  const memberStatusById = new Map(members.map((m) => [m.user.id, m.rsvp_status]));

  // Users who have already joined (including the host) can't be invited, so hide them
  const visibleResults = searchResults.filter((u) => memberStatusById.get(u.id) !== "accepted");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Allows user to dismiss modal when they click outside box */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />

          {/* Modal box */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-members-title"
            className="h-[540px] w-[calc(100%-2rem)] max-w-[540px] bg-bg-primary border-1 border-border-primary fixed top-1/2 left-1/2 rounded-2xl shadow-lg z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            transition={{ duration: 0.15 }}
          >
            <div className="h-full flex flex-col gap-6 p-4 pl-8">
              {/* Dismiss modal button */}
              <section className="flex justify-end w-full">
                <button onClick={onClose} className="hover:cursor-pointer hover:bg-bg-tertiary bg-bg-secondary rounded-md p-2 w-fit h-fit">
                  <X strokeWidth={3} size={16} />
                </button>
              </section>

              <h2 id="invite-members-title" className="text-2xl text-center font-medium">Who do you want to invite?</h2>

              <div className="relative pr-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                <input
                  autoFocus
                  placeholder="Search users"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-bg-secondary w-full rounded-md py-2 pl-9 pr-4"
                  autoComplete="off"
                />
              </div>

              {error && <p className="text-sm text-text-danger pr-4">{error}</p>}

              <ul className="flex flex-col gap-1 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
                {visibleResults.map((user) => {
                  const isPending = memberStatusById.get(user.id) === "pending";
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

                  return (
                    <li key={user.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-bg-secondary">
                      <div className="flex items-center gap-3 min-w-0">
                        {isValidImageUrl(user.image_url) && !brokenImageIds.has(user.id) ? (
                          <Image
                            width={36}
                            height={36}
                            className="rounded-full shrink-0"
                            alt={`${user.username} profile`}
                            src={user.image_url}
                            onError={() => setBrokenImageIds((prev) => new Set(prev).add(user.id))}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
                            <UserRound size={18} className="text-text-secondary" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <p className="text-text-primary text-md truncate">{user.username}</p>
                          {fullName && <p className="text-text-secondary text-xs truncate">{fullName}</p>}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => inviteMtn.mutate(user)}
                        className={clsx(
                          "shrink-0 w-24 py-1 rounded-lg text-sm font-medium transition-colors",
                          isPending
                            ? "bg-bg-tertiary text-text-secondary cursor-default"
                            : "bg-button-primary text-white hover:cursor-pointer hover:opacity-90"
                        )}
                      >
                        {isPending ? "Pending" : "Invite"}
                      </button>
                    </li>
                  );
                })}

                {debouncedSearchQuery && !isSearching && visibleResults.length === 0 && (
                  <p className="text-sm text-text-secondary text-center mt-8">No users found</p>
                )}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
