"use client";

import { Hangout } from "@/app/types";
import { CreateHangoutModal } from "./createHangoutModal";
import { useState } from "react";

export type HangoutsClientProps = {
  data: Hangout[]
}

export function HangoutsClient({data}: HangoutsClientProps) {
  const [isCreateHangoutModalOpen, setCreateHangoutModalOpen] = useState(false);

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
      
      <section id="collection" className="grid grid-cols-4 gap-4 px-4 w-full">
        {data.map(h => (
          HangoutPreviewCard(h)
        ))}
      </section>

    </section>
  )
}


function HangoutPreviewCard(hangout: Hangout) {
  return (
    <div key={hangout.id} className="h-[200px] w-full p-4 bg-bg-primary border-1 border-border-primary shadow-md rounded-lg">
      {hangout.title}
    </div>
  )
}

