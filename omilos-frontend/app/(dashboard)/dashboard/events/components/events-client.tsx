"use client";

import { CreateEventModal } from "./create-event-modal";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ClientEvent } from "@/app/types/client-types";
import { usePageActions } from "../../components/context/header-actions-context";
import { UserButton } from "@clerk/nextjs";
import { Calendar, Ellipsis, EllipsisVertical, FileText, SquareArrowOutUpRight, Trash2, UserGroup, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export type EventsClientProps = {
  events: ClientEvent[]
}

export function EventsClient({events}: EventsClientProps) {
  const [isCreateEventModalOpen, setCreateEventModalOpen] = useState(false);
  const router = useRouter();

  function openCreateModal() {
      setCreateEventModalOpen(true);
  }

  function closeCreateModal() {
    setCreateEventModalOpen(false);
  }

   // Renders custom header actions for this event
  usePageActions(
    <span className='flex items-center gap-4'>
      <UserButton/>
    </span>
  )

  return (
    <section className="flex flex-col w-full h-full max-w-[1700px] mx-auto py-6 gap-16">
      <CreateEventModal isOpen={isCreateEventModalOpen} onClose={closeCreateModal}/>
      <section id="header" className="flex justify-between w-full px-4">
        <div id="options-group" className="flex gap-8">
          <button id="create-event-btn" className="hover:cursor-pointer rounded-lg px-4 py-2 bg-bg-secondary font-medium" onClick={()=>openCreateModal()}>Create</button>
        </div>
      </section>
      
      <section id="collection" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 px-4 w-full">
        {events.map(h => (
          <EventPreviewCard key={h.slug} event={h} onClick={() => router.push(`/dashboard/events/${h.slug}`) }/>
        ))}
      </section>
    </section>
  )
}


function EventPreviewCard({ event, onClick }: { event: ClientEvent, onClick: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  return (
    <>
      <AnimatePresence>
        {isMembersModalOpen &&
          <>
            {/* Darkens the background and allows the user to dismiss the modal by clicking outside it */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMembersModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />

            <motion.div
              className="fixed top-1/2 left-1/2 z-50 h-[500px] w-[500px] bg-bg-primary rounded-xl shadow-md overflow-hidden p-4"
              initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              transition={{ duration: 0.15 }}
            >
              <section className="flex w-full justify-between">
                <h2 className="text-xl font-medium">Event Members</h2>
                <button onClick={()=>setIsMembersModalOpen(false)} className="hover:cursor-pointer bg-bg-secondary rounded-sm p-1 w-fit h-fit"><X size={16}/></button>
              </section>

              <ul className="flex flex-col gap-4 mt-8">
                {
                  event.members.map(member => (
                    <div className="flex justify-between items-center w-full" key={member.user.id}>

                    <div className="flex gap-2">
                      <div className="w-[24px] h-[24px] pt-1">
                        <Image
                          width={24}
                          height={24}
                          className="rounded-full"
                          alt="user profile"
                          src={member.user.image_url!}
                        />
                      </div>

                      <div className="flex flex-col">
                        <p className="text-text-primary text-md">{member.user.username}</p>
                        <p className="text-text-secondary text-sm">{member.user.email}</p>
                      </div>
                    </div>
                  </div>
                  ))
                }
              </ul>

            </motion.div>
          </>
        }
      </AnimatePresence>


      <div className="mx-auto w-full max-w-[400px] md:w-full md:max-w-[480px] lg:max-w-full bg-bg-primary border-1 border-border-primary shadow-md rounded-2xl flex flex-col gap-1 p-4 overflow-hidden">
        <section className="relative h-[200px] rounded-lg bg-bg-secondary overflow-hidden">
          {event.image_url &&
            <Image
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              alt="event cover image"
              src={event.image_url}
            />
          }
        </section>

        <section className="py-3 px-1">
          <h2 className="text-lg text-primary font-medium">{event.title}</h2>
          <p className="text-sm text-text-secondary">{event.description}</p>
        </section>

        <section className="flex w-full items-center gap-2 px-1">
          <>
            {event.members?.filter(m => m.user.id === event.host_id).map((m) =>
              m.user.image_url?.length ?
              <Image
                key={m.user.id}
                className="rounded-full w-7 h-7 object-cover"
                height={32}
                width={32}
                alt="user profile"
                src={m.user.image_url}/>
              :
              <div key={m.user.id} className="h-8 w-8 rounded-full bg-bg-secondary flex items-center justify-center text-xs font-medium text-secondary">
                {m.user.first_name[0] + m.user.last_name[0]}
              </div>
            )}

            {event.members?.filter(m => m.user.id === event.host_id).map((m) => 
              <p key={m.user.clerk_id} className="text-text-secondary text-sm">{m.user.first_name + " " + m.user.last_name}</p>
            )}

          </>
        </section>

        {/* Tag List */}
        <section className="pt-6 px-1 flex justify-between">
          <span className="flex gap-2">
            <div className="bg-bg-secondary shadow-sm rounded-md w-fit py-1 px-2 flex items-center gap-1">
              <Calendar size={16} className="text-text-secondary"/>
              <p className="text-xs text-text-secondary">{new Date(event.date).toDateString()}</p>
            </div>

            <div className="bg-bg-secondary shadow-sm rounded-md w-fit py-1 px-2 flex items-center gap-1">
              <UserGroup size={16} className="text-text-secondary"/>
              <p className="text-xs text-text-secondary" >{event.members.length + " " + "going"}</p>
            </div>
          </span>

          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(prev => !prev);
              }}
              className="hover:cursor-pointer bg-bg-secondary shadow-md p-1 rounded-md"
            >
              <Ellipsis size={18}/>
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  className="absolute right-0 bottom-full mb-2 w-44 bg-bg-primary border border-border-transparent shadow-md rounded-xl py-1 z-10"
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ duration: 0.12 }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMembersModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-secondary hover:cursor-pointer"
                  >
                    <UserGroup size={16}/>
                    Members
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-secondary hover:cursor-pointer"
                  >
                    <SquareArrowOutUpRight size={16}/>
                    View details
                  </button>
                  <button onClick={(e) => e.stopPropagation()} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-danger hover:bg-bg-secondary hover:cursor-pointer">
                    <Trash2 size={16}/>
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </>
  )
}

