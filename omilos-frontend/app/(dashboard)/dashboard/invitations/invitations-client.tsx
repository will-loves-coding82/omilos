"use client";

import { ClientInvite } from "@/app/types/client-types";
import TabButton from "../events/components/tab-button";
import { useEffect, useState } from "react";
import { acceptInvite, declineInvite, resendDeclinedInvite } from "@/app/actions/invite-actions";
import { formatElapsedTime } from "@/app/utils";
import { createPortal } from "react-dom";
import { CircleX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { usePageActions } from "../components/context/header-actions-context";


export type InvitationsClientProps = {
  activeTabParam: string,
  data: {
    sent: ClientInvite[],
    received: ClientInvite[]
  }
}

export default function InvitationsClient({activeTabParam, data} : InvitationsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("activeTab") ?? activeTabParam;

  useEffect(() => {
  if (!searchParams.get("activeTab")) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("activeTab", activeTab);
    router.replace(`${pathname}?${params.toString()}`);
  }
}, []);

  function updateActiveTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("activeTab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function onAcceptInvite(invite: ClientInvite) {
  try {
    const res = await acceptInvite(invite);
    if (!res.success) {
      console.log("Failed to accept invite")
    }
  }
  catch (err) {
    console.log("Error accepting invite: " + err)
  }
  }

  async function onDeclineInvite(invite: ClientInvite) {
  try {
      const res = await declineInvite(invite);
      if (!res.success) {
        console.log("Failed to decline invite")
      }
    }
    catch (err) {
      console.log("Error declining invite: " + err)
    }
  }

  usePageActions(
    <span className='flex items-center gap-4'>
      <UserButton/>
    </span>
  )
    
  return (
    <section className="flex flex-col w-full h-full max-w-4xl mx-auto py-6">
      <h1 className="text-primary text-xl font-medium">Your invites</h1>
      <section className="flex items-center gap-4 px-1 py-4 border-b border-border-primary">
        <span className="flex items-center gap-1">
          <TabButton label="Received" activeTab={activeTab} onClick={updateActiveTab} />
          {data.received.length > 0 && 
            <p className={`h-[18px] w-[18px] border-box flex justify-center items-center border-2 border-badge-border bg-badge-bg rounded-full text-[10px] text-badge-text`}>
              {data.received.length}
            </p>
          }
        </span>
        <TabButton label="Sent" activeTab={activeTab} onClick={updateActiveTab} />
      </section>
      <section>
        {
          activeTab === "Received" && 
          <ul className="flex flex-col gap-4 py-4">
            {
              data.received.length > 0 &&
              data.received.map(invite => (
                <InviteReceivedCard key={invite.event.slug} invite={invite} onAccept={onAcceptInvite} onDecline={onDeclineInvite}/>
              ))
            }
          </ul>
        }

        {
          activeTab === "Sent" && 
          <ul className="flex flex-col gap-4 py-4">
            {
              data.sent.length > 0 &&
              data.sent.map(invite => (
                <InviteSentCard key={invite.event.slug} invite={invite}/>
              ))
            }
          </ul>
        }
      </section>
    </section>
  )
}

type InviteSentCardProps = {
  invite: ClientInvite
}

function InviteSentCard({invite}: InviteSentCardProps) {
  const [isResendInviteModalOpen, setIsResendInviteModalOpen] = useState(false);

  function closeModal() {
    setIsResendInviteModalOpen(false);
  }

  async function resendInvite() {
    try {
      const res = await resendDeclinedInvite(invite);
      if (!res.success) {
        console.log("Could not resend invite")
      }
      closeModal();
    }
    catch(err) {
      console.log(err)
    }
  }

  return (
    <div className="flex flex-col gap-1 w-full rounded-lg bg-bg-secondary p-3">
      {isResendInviteModalOpen &&
        createPortal(
          <ResendInviteModal invite={invite} isOpen={isResendInviteModalOpen} onClose={closeModal} onResend={resendInvite}/>,
          document.body
        )
      }
      <span className="flex justify-between w-full">
        <p className="text-md text-text-secondary"><span className="text-primary font-medium">You</span> invited {invite.event_member.user.username} to join <span className="text-text-primary font-medium">{invite.event.title}</span></p>
        {invite.event_member.rsvp_status === "declined" && 
          <button onClick={() =>setIsResendInviteModalOpen(true)} className="hover:cursor-pointer bg-bg-tertiary text-text-secondary px-2 py-1 rounded-md w-fit text-xs font-medium">
            resend
          </button>
        }
      </span>
      <span className="flex gap-2">
        <p className="text-text-secondary text-sm">{formatElapsedTime(invite.event_member.created_at)}</p>
        <RSVPStatusPill status={invite.event_member.rsvp_status}/>
      </span>
    </div>
  )
}

type InviteReceivedCardProps = {
  invite: ClientInvite,
  onAccept: (invite: ClientInvite) => void,
  onDecline: (invite: ClientInvite) => void,
}

function InviteReceivedCard({invite, onAccept, onDecline}: InviteReceivedCardProps) {
  return (
    <div className="flex justify-between items-center w-full rounded-lg bg-bg-secondary p-3">
      <div className="flex flex-col gap-1">
      <p className="text-md text-text-secondary">
        <span className="text-text-primary">{invite.host_user.username}</span> invited you to join <span className="text-text-primary font-medium">{invite.event.title}</span></p>
        <p className="text-text-secondary text-sm">{formatElapsedTime(invite.event_member.created_at)}</p>
      </div>
      <span>
        <button onClick={async()=>{onDecline(invite)}} className="hover:cursor-pointer py-1 px-3 rounded-md text-red-400">Decline</button>
        <button onClick={async()=>{onAccept(invite)}} className="hover:cursor-pointer bg-button-primary text-text-inverse py-1 px-3 rounded-md">Accept</button>
      </span>
    </div>
  )
}


type ResendInviteModalProps = {
  invite: ClientInvite,
  isOpen: boolean,
  onClose: () => void,
  onResend: () => void
}

function ResendInviteModal({invite, isOpen, onResend, onClose}: ResendInviteModalProps) {
  return (
    <AnimatePresence>
       {isOpen && (
        <>
          <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => onClose()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
          />
          <div className="inset-0 m-auto h-[300px] w-full max-w-[540px] bg-bg-primary border-1 border-border-primary fixed rounded-2xl shadow-lg z-50 overflow-hidden">
            <div className="h-full flex flex-col overflow-y-auto pl-8 p-4 [scrollbar-gutter:stable]">
              {/* Dismiss modal button */}
              <section className="flex justify-end w-full">
                <button className="hover:cursor-pointer" onClick={onClose}><CircleX className="text-text-secondary" /></button>
              </section>

              <div className="flex flex-col h-full gap-4 py-4 justify-between">
                <section>
                  <h2 className="text-text-primary text-center text-2xl font-medium">Resend invitation</h2>
                  <p className="text-text-secondary text-center">{invite.event_member.user.username} declined this invite. Are you sure?</p>
                </section>

                <section className="flex flex-col gap-2">
                  <button onClick={onResend} className="h-[40px] hover:cursor-pointer bg-bg-secondary text-text-primary w-full px-2 py-1 rounded-md font-medium">Yes</button>
                  <button onClick={onClose} className="h-[40px] hover:cursor-pointer text-text-danger w-full px-2 py-1 rounded-md font-medium">Cancel</button>
                </section>
              </div>
            </div>
          </div> 
        </>
      )}
    </AnimatePresence>
    
  )
}

function RSVPStatusPill({status}: {status: string}) {
  switch (status) {
    case "accepted":
      return <div className="bg-bg-success/30 text-text-success px-2 py-1 rounded-full w-fit text-xs font-medium">{status}</div>
    case "declined":
      return <div className="bg-bg-danger/15 text-text-danger px-2 py-1 rounded-full w-fit text-xs font-medium">{status}</div>
    case "pending":
      return <div className="bg-bg-warning/15 text-text-warning px-2 py-1 rounded-full w-fit text-xs font-medium">{status}</div>
  }
}
