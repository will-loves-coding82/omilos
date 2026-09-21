import { ClientEventStop } from "@/app/types/client-types"
import { Trash, X } from "lucide-react"

export type EventStopSidePanelProps = {
  stop: ClientEventStop,
  isOpen: boolean,
  onDismiss: () => void,
  onDeleteStop: (stopId: number) => void  
}

export default function EventStopSidePanel({stop, isOpen, onDismiss, onDeleteStop}: EventStopSidePanelProps) {
  return (
    <div
      className={`absolute inset-y-0 right-0 z-10 w-full bg-bg-primary md:w-[380px] shadow-md transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex justify-between w-full border-b-1 p-3 border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary">Stop Details</h3>
        <button onClick={onDismiss} id="dismiss-btn" className="hover:bg-bg-secondary hover:cursor-pointer rounded-md p-1 w-7 h-7 flex justify-center items-center"><X size={16}/></button>
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
            <button
              onClick={() => {}}
              className="hover:cursor-pointer"
              >
              
            </button>
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
        <ul className="bg-bg-secondary rounded-lg p-2 min-h-[400px]">

        </ul>
      </div>
    </div>
  )
}