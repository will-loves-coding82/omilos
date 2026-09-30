"use client";

import { ClientEventMember, ClientEventStop, ClientStopStatus } from "@/app/types/client-types"
import { Car, CircleCheck, Clock, Trash, X, XCircle } from "lucide-react"
import Image from "next/image"

export type EventStopSidePanelProps = {
  stop: ClientEventStop,
  members: ClientEventMember[],
  isOpen: boolean,
  isActive: boolean,
  onDismiss: () => void,
  onDeleteStop: (stopId: number) => void,
  onToggleActive: (isActive: boolean) => void,
}

const STOP_STATUS_CONFIG: Record<ClientStopStatus, { label: string, icon: typeof Clock, className: string }> = {
  not_started: { label: "Not started", icon: Clock, className: "bg-bg-tertiary/50 text-text-secondary" },
  in_progress: { label: "On the way", icon: Car, className: "bg-bg-info/20 text-text-info" },
  arrived: { label: "Arrived", icon: CircleCheck, className: "bg-bg-success/50 text-text-success" },
  no_show: { label: "No show", icon: XCircle, className: "bg-bg-danger/20 text-text-danger" },
}

export default function EventStopSidePanel({stop, members, isOpen, isActive, onDismiss, onDeleteStop, onToggleActive}: EventStopSidePanelProps) {
  return (
    <div
      className={`absolute inset-y-0 right-0 z-10 w-full bg-bg-primary md:w-[380px] shadow-md transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex justify-between w-full border-b-1 p-3 border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary">Stop Details</h3>
        <button onClick={onDismiss} id="dismiss-btn" className="bg-button-secondary hover:cursor-pointer rounded-md p-1 w-7 h-7 flex justify-center items-center"><X size={16}/></button>
      </div>

      <div className="p-3">
        <p className="text-text-primary text-md font-medium">{stop.name}</p>
        <p className="text-text-secondary">{stop.address ?? "No address"}</p>
      </div>

      <div className="flex flex-col gap-2 px-3">      
        {stop.id !== undefined && (
          <>
          <div className="bg-bg-secondary w-full rounded-lg flex items-center justify-between p-3">
            <p className="text-text-secondary">Active Status</p>
            <div className="flex items-center gap-2">
              {/* {isActive && (
                <span className="flex items-center gap-1 bg-bg-success/50 text-text-success text-xs font-medium rounded-full px-2 py-0.5">
                  <CircleCheck size={12} strokeWidth={3}/>
                  Active
                </span>
              )} */}
              <button
                onClick={() => onToggleActive(!isActive)}
                aria-pressed={isActive}
                aria-label="Toggle active status"
                className={`hover:cursor-pointer relative w-9 h-5 rounded-full transition-colors duration-200 ${
                  isActive ? 'bg-bg-success' : 'bg-bg-tertiary'
                }`}
                >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    isActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-bg-secondary w-full rounded-lg flex items-center justify-between p-3">
            <p className="text-text-secondary">Delete stop</p>
            <button
              onClick={() => onDeleteStop(stop.id!)}
              className="hover:cursor-pointer"
              >
              <Trash size={16} className="text-text-danger"/>
            </button>
          </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 mt-4 p-3">
        <h3 className="text-md text-text-primary font-medium">Member Status</h3>
        <ul className="bg-bg-secondary rounded-lg p-2 min-h-[400px] flex flex-col gap-1">
          {members.filter(m => m.rsvp_status === "accepted").map(member => {
            const memberStatus = stop.stop_member_status_arr?.find(s => s.clerk_id === member.user.clerk_id);
            const { label, icon: Icon, className } = STOP_STATUS_CONFIG[memberStatus?.stop_status ?? "not_started"];

            return (
              <div key={member.user.clerk_id} className="flex justify-between items-center w-full p-2">
                <div className="flex items-center gap-2">
                  <div className="w-[24px] h-[24px]">
                    {member.user.image_url ? (
                      <Image
                        width={24}
                        height={24}
                        className="rounded-full"
                        alt="user profile"
                        src={member.user.image_url}
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] font-medium text-text-secondary">
                        {member.user.first_name[0] + member.user.last_name[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-text-primary text-sm">{member.user.username}</p>
                </div>

                <div className={`flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${className}`}>
                  <Icon size={12} strokeWidth={3}/>
                  {label}
                </div>
              </div>
            );
          })}
        </ul>
      </div>
    </div>
  )
}