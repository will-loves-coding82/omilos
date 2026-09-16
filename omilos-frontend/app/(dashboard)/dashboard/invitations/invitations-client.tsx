"use client";

import { ClientInvite } from "@/app/types/client";
import TabButton from "../events/components/tab-button";
import { useState } from "react";
import { acceptInvite, declineInvite } from "@/app/actions/invite-actions";

export type InvitationsClientProps = {
  data: {
    sent: ClientInvite[],
    received: ClientInvite[]
  }
}

export default function InvitationsClient({data} : InvitationsClientProps) {
   const [activeTab, setActiveTab] = useState<string>("Sent");

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
  
  return (
    <section className="flex flex-col w-full h-full max-w-4xl mx-auto py-6">
      <h1 className="text-text-primary text-xl font-medium">Your invites</h1>
      <section className="flex items-center gap-4 px-1 py-4 border-b border-border-primary">
        <TabButton label="Sent" activeTab={activeTab} onClick={setActiveTab} />
        <span className="flex items-center gap-1">
          <TabButton label="Received" activeTab={activeTab} onClick={setActiveTab} />
          {data.received.length > 0 && 
            <p className={`h-[18px] w-[18px] border-box flex justify-center items-center border-2 border-badge-border bg-badge-bg rounded-full text-[10px] text-badge-text`}>
              {data.received.length}
            </p>
          }
        </span>
      </section>
      <section>
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
      </section>
    </section>
  )
}

type InviteSentCardProps = {
  invite: ClientInvite
}

function InviteSentCard({invite}: InviteSentCardProps) {
  return (
    <div className="w-full rounded-lg bg-bg-secondary p-3">
      <p className="text-lg font-medium">You</p>
      <p className="text-text-secondary">Invited {invite.event_member.member.first_name} to join {invite.event.title}</p>
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
      <div>
        <p className="text-lg font-medium">{invite.host_user.first_name}</p>
        <p className="text-text-secondary">Invited you to join {invite.event.title}</p>
      </div>
      <span>
        <button onClick={async()=>{onDecline(invite)}} className="hover:cursor-pointer py-1 px-3 rounded-md text-red-400">Decline</button>
        <button onClick={async()=>{onAccept(invite)}} className="hover:cursor-pointer bg-text-primary text-text-inverse py-1 px-3 rounded-md">Accept</button>
      </span>
    </div>
  )
}