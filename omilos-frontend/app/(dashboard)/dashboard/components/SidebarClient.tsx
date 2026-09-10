"use client";

import { Calendar, MapPinPlusInside, PanelLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function SidebarClient() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <nav className={`flex flex-col h-full ${isOpen ? "w-[216px]": "w-[80px]"} border-r-1 border-1 border-border-primary transition-all duration-300`}>
      <section className={`flex items-center m-4 h-[40px] ${isOpen ? "justify-between" : "justify-center"}`}>
          {isOpen ? <Link href="/" className="text-lg font-medium stext-text-primary">Omilos</Link> : null}
          <button 
            className="text-text-primary hover:cursor-pointer"
            onClick={(e) => {
              e.preventDefault() 
              setIsOpen(!isOpen)
            }}
            >
            <PanelLeft size={20}/>
          </button>
        </section>

        <section className="flex flex-col m-4 gap-2">
          <SidebarLink pathname={pathname} title={"Hangouts"} isOpen={isOpen} icon={<Calendar size={20}/>} />
          <SidebarLink pathname={pathname} title={"Create"} isOpen={isOpen} icon={<MapPinPlusInside size={20}/>}/>
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
      className={`${isActive ? "bg-bg-success" : "bg-bg-primary"} bg transition-all duration-200 hover:cursor-pointer px-3 py-2 rounded-lg w-full text-text-primary`}
    >
      <div className={`${isActive ? "text-text-inverse" : "text-text-primary"}`}>
        {isOpen ? title : icon}
      </div>
    </Link>
  )
}