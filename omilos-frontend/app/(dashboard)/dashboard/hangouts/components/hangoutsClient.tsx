"use client";

import { OmilosEvent } from "@/app/types";
import { CreateHangoutModal } from "./createHangoutModal";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { on } from "events";


export type HangoutsClientProps = {
  data: OmilosEvent[]
}

export function HangoutsClient({data}: HangoutsClientProps) {
  const [isCreateHangoutModalOpen, setCreateHangoutModalOpen] = useState(false);
  const router = useRouter();

  function openCreateModal() {
      setCreateHangoutModalOpen(true);
  }

  function closeCreateModal() {
    setCreateHangoutModalOpen(false);
  }

  return (
    <section className="flex flex-col w-full h-full py-6 gap-16">
      <CreateHangoutModal isOpen={isCreateHangoutModalOpen} onClose={closeCreateModal}/>
      <section id="header" className="flex justify-between w-full px-4">
        {/* Hangout search bar  */}
        <div></div>
        <div id="options-group" className="flex gap-8">
          <button id="create-hangout-btn" className="rounded-lg px-4 py-2 bg-bg-secondary font-medium" onClick={()=>openCreateModal()}>Create</button>
        </div>
      </section>
      
      <section id="collection" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 px-4 w-full">
        {data.map(h => (
          <HangoutPreviewCard key={h.slug} hangout={h} onClick={() => router.push(`/dashboard/hangouts/${h.slug}`) }/>
        ))}
      </section>
    </section>
  )
}


function HangoutPreviewCard({ hangout, onClick }: { hangout: OmilosEvent, onClick: () => void }) {
  return (
    <div onClick={onClick} className="hover:cursor-pointer mx-auto w-full max-w-[400px] md:w-full md:max-w-[480px] lg:max-w-full bg-bg-primary border-1 border-border-primary shadow-md rounded-lg overflow-hidden">
      <section className="relative h-[140px] bg-bg-secondary overflow-hidden">
        {hangout.image_url &&
          <Image
            fill
            className="object-cover"
            alt="hangout cover image"
            src={hangout.image_url}
          />
        }
      </section>
      <section className="p-4">
        <h2 className="text-md text-text-primary font-medium">{hangout.title}</h2>
        <p className="text-sm text-text-secondary">{hangout.description}</p>
      </section>

      <section className="flex w-full items-center gap-1 p-4">
        {hangout.members?.map((m) =>
          m.image_url?.length ?
          <Image
            key={m.id}
            className="rounded-full w-8 h-8 object-cover"
            height={32}
            width={32}
            alt="user profile"
            src={m.image_url}/>
          :
          <div key={m.id} className="h-8 w-8 rounded-full bg-bg-secondary flex items-center justify-center text-xs font-medium text-text-secondary">
            {m.first_name[0]+ m.last_name[0]}
          </div>
        )}

      </section>
    </div>
  )
}

