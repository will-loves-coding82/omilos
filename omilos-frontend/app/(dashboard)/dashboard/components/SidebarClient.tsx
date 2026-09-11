"use client";


import { Calendar, User, PanelLeft, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function SidebarClient() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <nav className={`flex flex-col h-full ${isOpen ? "min-w-[224px]": "min-w-[80px]"} shadow-md transition-all duration-300`}>
      <section className={`h-[64px] flex items-center p-4 ${isOpen ? "justify-between" : "justify-center"}`}>
          {isOpen ? <Link href="/" className="flex items-center gap-3 font-medium text-text-primary"><p className="text-3xl">O</p><p className="text-md">Omilos</p></Link> : null}
          <button 
            className="text-text-primary hover:cursor-pointer"
            onClick={(e) => {
              e.preventDefault() 
              setIsOpen(!isOpen)
            }}
            >
            <PanelLeft size={20} className="text-text-secondary"/>
          </button>
        </section>

        <section className="flex flex-col m-4 gap-2">
          <SidebarLink pathname={pathname} title={"Hangouts"} isOpen={isOpen} icon={<Calendar size={20}/>} />
          <SidebarLink pathname={pathname} title={"Invitations"} isOpen={isOpen} icon={<Bell size={20}/>} />
          <SidebarLink pathname={pathname} title={"Profile"} isOpen={isOpen} icon={<User size={20}/>} />
        </section>
    </nav>
  )
}


type SidebarLinkProps = {
  title: String, 
  icon: React.ReactNode,
  pathname: String, 
  isOpen: Boolean
}

function SidebarLink({pathname, title, isOpen, icon}: SidebarLinkProps) {
  const isActive = (pathname.split("/").at(-1)?.toLocaleLowerCase().includes(title.toLocaleLowerCase()));
  return (
    <Link 
      href={`/dashboard/${title.toLocaleLowerCase()}`}
      className={`h-[40px] flex items-center ${isActive ? "bg-bg-secondary" : "bg-bg-primary"} bg transition-all duration-200 hover:cursor-pointer px-3 py-2 rounded-lg w-full text-text-primary`}
    >
      <div className={`flex items-center w-full gap-2 ${isActive ? "text-text-primary font-medium" : "text-text-secondary"}`}>
        <span className="shrink-0">{icon}</span>
        {isOpen ? <span>{title}</span> : null}
      </div>
    </Link>
  )
}