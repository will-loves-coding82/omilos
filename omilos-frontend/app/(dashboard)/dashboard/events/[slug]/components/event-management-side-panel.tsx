"use client";

import { useEffect, useRef, useState } from "react";
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { move } from '@dnd-kit/helpers';
import { CheckIcon, ChevronDown, ChevronDownIcon, CircleCheck, EllipsisVertical, GripVertical, Trash2, UserCircle, X } from "lucide-react";
import { ClientEventMember, ClientEventStop } from "@/app/types/client-types";
import TabButton from "../../components/tab-button";
import Image from "next/image";
import { Can, useAbility } from "@casl/react";
import { AnimatePresence, motion } from "motion/react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import clsx from 'clsx'

const PANEL_WIDTH_DESKTOP = "374px";

type EventSidePanelProps = {
  members: ClientEventMember[];
  eventStops: ClientEventStop[];
  onReorderStops: (stops: ClientEventStop[]) => void;
  onSelectStop: (stop: ClientEventStop) => void;
  activeStopId: string | null;
  activeEventStopId?: number;
};

export default function EventManagementSidePanel({ members, eventStops, onReorderStops, onSelectStop, activeStopId, activeEventStopId }: EventSidePanelProps) {
  const [activeTab, setActiveTab] = useState<string>("Stops");
  const ref = useRef<HTMLUListElement | null>(null);

  // Expose this panel's width as a CSS variable (desktop only, since on
  // mobile it's a full-screen overlay and doesn't need to offset anything)
  // so other overlays (e.g. the map's search box) can position around it.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');

    const updatePanelWidth = () => {
      document.documentElement.style.setProperty(
        '--panel-width',
        mediaQuery.matches ? PANEL_WIDTH_DESKTOP : '0px'
      );
    };

    updatePanelWidth();
    mediaQuery.addEventListener('change', updatePanelWidth);

    return () => {
      mediaQuery.removeEventListener('change', updatePanelWidth);
      document.documentElement.style.setProperty('--panel-width', '0px');
    };
  }, []);

  return (
    <div className="absolute inset-0 z-10 bg-bg-primary md:inset-auto md:top-0 md:h-full md:w-[var(--panel-width)] md:shadow-md transition-[left] duration-300">
      <section className="flex items-center gap-4 p-4 border-b border-border-primary">
        <TabButton label="Stops" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Participants" activeTab={activeTab} onClick={setActiveTab} />
      </section>

      <section className="p-3">
        {
          activeTab === "Stops" &&
          <DragDropProvider
            onDragEnd={(event) => {
              const stopsByMapboxId = new Map(eventStops.map(stop => [stop.mapbox_id, stop]));
              const reorderedMapboxIds = move(eventStops.map(stop => stop.mapbox_id), event);
              onReorderStops(reorderedMapboxIds.map(mapboxId => stopsByMapboxId.get(mapboxId)!));
            }}
          >
            <ul ref={ref} className="flex flex-col gap-2">
              {eventStops.map((stop, index) => (
                <SortableStop
                  key={stop.mapbox_id}
                  stop={stop}
                  index={index}
                  onSelectStop={onSelectStop}
                  isSelected={activeStopId === stop.mapbox_id}
                  isActive={stop.id !== undefined && stop.id === activeEventStopId}
                />
              ))}
            </ul>
          </DragDropProvider>
        }
        {
          activeTab === "Participants" &&
          <ul className="flex flex-col gap-4">
            {
              members.sort((a, b) => a.rsvp_status.localeCompare(b.rsvp_status)).map((member, _) => (
                <MemberCard key={member.user.id} member={member}/>
              ))
            }
          </ul>
        }
      </section>
    </div>
  );
}

function MemberCard({member}: {member: ClientEventMember}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLButtonElement>(null);
    const ability = useAbility();

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
            <p className="text-text-secondary text-xs">{member.user.first_name + ' ' + member.user.last_name}</p>
          </div>
        </div>

        
        <div className="relative">
          <span className="flex gap-2">
            {member.member_role === "host" && 
              <div className="w-fit h-fit flex justify-center items-center bg-bg-info px-3 py-1 rounded-lg text-md text-white">
                Host
              </div>
            }


            {member.member_role !== "host" && 
              <Listbox value={member.member_role} onChange={()=> {}} >
                <ListboxButton
                  disabled={ability.cannot('edit', 'User')}
                  className={clsx(
                  'flex items-center gap-3 rounded-lg bg-bg-secondary py-1 px-4 justify-between text-md text-text-primary',
                  'focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25',
                  `${ability.can('edit', 'User') && "hover:cursor-pointer hover:bg-bg-tertiary"}`
                )}
                >
                  {member.member_role.charAt(0).toUpperCase() + member.member_role.slice(1)}
                  {
                    ability.can('edit', 'User') &&
                    <ChevronDownIcon
                      className="group pointer-events-none  size-4"
                      aria-hidden="true"
                    />
                  }
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom"
                  transition
                  className={clsx(
                    'w-(--button-width) rounded-lg bg-bg-secondary border-1 border-border-primary [--anchor-gap:--spacing(1)] focus:outline-none',
                    'transition duration-100 ease-in data-leave:data-closed:opacity-0'
                  )}
                >
                  <ListboxOption key={0} value="editor" className="group flex cursor-default items-center gap-2 px-3 py-1.5 select-none data-focus:bg-bg-tertiary">
                    <CheckIcon className="invisible size-4 group-data-selected:visible" />
                    Editor
                  </ListboxOption>
                  <ListboxOption key={1} value="viewer" className="group flex cursor-default items-center gap-2 px-3 py-1.5 select-none data-focus:bg-bg-tertiary">
                    <CheckIcon className="invisible size-4 group-data-selected:visible" />
                    Viewer
                  </ListboxOption>
                </ListboxOptions>
              </Listbox>
            }

            <button
               ref={menuRef} 
               onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(prev => !prev);
              }}
              className="bg-bg-secondary hover:bg-bg-tertiary hover:cursor-pointer w-fit h-fit p-2 rounded-lg"
              >
              <EllipsisVertical size={18}/>
            </button>
          </span>

          <AnimatePresence>
            {isMenuOpen &&
               <motion.div
                  className="absolute right-0 top-full mt-2 w-32 bg-bg-primary border border-border-transparent shadow-md rounded-xl z-10 overflow-hidden"
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ duration: 0.12 }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-secondary hover:cursor-pointer"
                  >
                    <UserCircle size={16}/>
                    Info
                  </button>
                  <Can I='edit' a='user'>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="w-full flex items-center rounded-b-xl gap-2 px-3 py-2 text-sm font-medium text-text-danger hover:bg-bg-secondary hover:cursor-pointer"
                    >
                      <Trash2 size={16}/>
                      Remove
                    </button>
                  </Can>
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </div>
    )
}

type SortableStopProps = {
  stop: ClientEventStop;
  index: number;
  onSelectStop: (stop: ClientEventStop) => void;
  isSelected: boolean;
  isActive: boolean;
};

function SortableStop({ stop, index, onSelectStop, isSelected, isActive }: SortableStopProps) {
  const id = stop.mapbox_id
  const handleRef = useRef<HTMLButtonElement | null>(null);
  const { ref, isDragging } = useSortable({ id, index, handle: handleRef });

  return (
    <li
      ref={ref}
      onClick={() => onSelectStop(stop)}
      className={`hover:cursor-pointer h-[108px] transition-colors duration-100 ease-in ${isSelected ? "bg-bg-active" : "bg-bg-secondary"} p-3 flex justify-between gap-1 rounded-lg ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-col justify-between gap-1">
        <div className="flex flex-col">
          <h3 className={`text-lg font-semibold transition-colors duration-100 ease-in ${isSelected ? "text-text-active" : "text-text-primary"}`}>{stop.name}</h3>
          <p className={`text-md transition-colors duration-100 ease-in ${isSelected ? "text-text-active" : "text-text-secondary"}`}>{stop.address}</p>
        </div>
        {isActive && (
          <span className="w-fit flex items-center gap-1 bg-bg-success/50 text-text-success text-xs font-medium rounded-md px-2 py-0.5">
            <CircleCheck size={12} strokeWidth={3} />
            Active
          </span>
        )}
      </div>
      <button ref={handleRef} className="cursor-grab hover:cursor-pointer active:cursor-grabbing">
        <GripVertical size={20} className="my-auto" />
      </button>
    </li>
  )
}