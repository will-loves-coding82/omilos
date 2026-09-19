"use client";

import { useEffect, useRef, useState } from "react";
import {DragDropProvider} from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { move } from '@dnd-kit/helpers';
import { Check, GripVertical, RotateCcwClock, X } from "lucide-react";
import { ClientEventMember, ClientEventStop } from "@/app/types/client-types";
import TabButton from "../../components/tab-button";
import Image from "next/image";

const PANEL_WIDTH_DESKTOP = "340px";

type EventSidePanelProps = {
  participants: ClientEventMember[];
  eventStops: ClientEventStop[];
  onReorderStops: (stops: ClientEventStop[]) => void;
  onSelectStop: (stop: ClientEventStop) => void;
  activeStopId: string | null;
};

export default function EventStopsMembersSidePanel({participants, eventStops, onReorderStops, onSelectStop, activeStopId} : EventSidePanelProps) {
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
                <SortableStop key={stop.mapbox_id} stop={stop} index={index} onSelectStop={onSelectStop} isSelected={activeStopId === stop.mapbox_id}/>
              ))}
            </ul>
          </DragDropProvider>
        }
        {
          activeTab === "Participants" && 
            <ul className="flex flex-col gap-4">

              {/* TODO: Only the host can see which people declined or is pending */}
              {participants.sort((a,b) => a.rsvp_status.localeCompare(b.rsvp_status)).map((member, index)=> (
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

                  {/* TODO: Only the host can see these status icons */}
                  { member.rsvp_status === "pending" && <div className="w-[20px] h-[20px] flex justify-center items-center flex justify-between p-1 bg-bg-warning/50 rounded-full"><RotateCcwClock className="text-text-warning" strokeWidth={3}  size={14}/></div> }
                  { member.rsvp_status === "accepted" && <div className="w-[20px] h-[20px] flex justify-center items-center p-1 bg-bg-success/50 rounded-full"><Check className="text-text-success" strokeWidth={4} size={14}/></div> }
                  { member.rsvp_status === "declined" && <div className="w-[20px] h-[20px] flex justify-center items-center bg-bg-danger/50 rounded-full"><X className="text-text-danger" strokeWidth={3} size={12}/></div> }
                </div>
              ))
              }
            </ul>
        }
      </section>
    </div>
  );
}

type SortableStopProps = {
  stop: ClientEventStop;
  index: number;
  onSelectStop: (stop: ClientEventStop) => void;
  isSelected: boolean;
};

function SortableStop({stop, index, onSelectStop, isSelected}: SortableStopProps) {
  const id = stop.mapbox_id
  const handleRef = useRef<HTMLButtonElement | null>(null);
  const { ref, isDragging } = useSortable({id, index, handle: handleRef});

  return (
    <li
      ref={ref}
      onClick={() => onSelectStop(stop)}
      className={`hover:cursor-pointer min-h-24 max-h-32 transition-colors duration-100 ease-in ${isSelected ? "bg-bg-active" : "bg-bg-secondary"} p-3 flex justify-between gap-1 rounded-lg ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-col">
        <h3 className={`text-lg font-semibold transition-colors duration-100 ease-in ${isSelected ? "text-text-active" : "text-text-primary"}`}>{stop.name}</h3>
        <p className={`text-md transition-colors duration-100 ease-in ${isSelected ? "text-text-active" : "text-text-secondary"}`}>{stop.address}</p>
      </div>
      <button ref={handleRef} className="cursor-grab hover:cursor-pointer active:cursor-grabbing">
        <GripVertical size={20} className="my-auto"/>
      </button>
    </li>
  )
}