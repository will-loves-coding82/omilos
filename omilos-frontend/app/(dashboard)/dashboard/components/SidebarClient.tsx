"use client";


import { Calendar, User, PanelLeft, Bell, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export default function SidebarClient() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-40 bg-bg-primary shadow-md rounded-lg p-2 text-text-primary hover:cursor-pointer"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={20} className="text-text-secondary" />
      </button>

      <nav className={`hidden md:flex flex-col h-full ${isOpen ? "min-w-[224px]": "min-w-[80px]"} bg-bg-primary shadow-md transition-all duration-300`}>
        <section className={`h-[64px] flex items-center p-4 ${isOpen ? "justify-between" : "justify-center"}`}>
            {isOpen ? <Link href="/" className="flex items-center gap-3 font-medium text-text-primary"><p className="text-3xl">O</p><p className="text-md">Omilos</p></Link> : null}
            <button
              className="text-text-primary hover:cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                setIsOpen(!isOpen)
              }}
              >
              <PanelLeft size={20} className="text-text-primary"/>
            </button>
          </section>

          <section className="flex flex-col m-4 gap-2">
            <SidebarLink pathname={pathname} title={"Hangouts"} isOpen={isOpen} icon={<Calendar size={20}/>} />
            <SidebarLink pathname={pathname} title={"Invitations"} isOpen={isOpen} icon={<Bell size={20}/>} />
            <SidebarLink pathname={pathname} title={"Profile"} isOpen={isOpen} icon={<User size={20}/>} />
          </section>
      </nav>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.nav
              className="md:hidden fixed top-0 left-0 h-full w-[224px] bg-bg-secondary shadow-md z-50 flex flex-col"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <section className="h-[64px] flex items-center justify-between p-4">
                <Link href="/" className="flex items-center gap-3 font-medium text-text-primary"><p className="text-3xl">O</p><p className="text-md">Omilos</p></Link>
                <button
                  className="text-text-primary hover:cursor-pointer"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X size={20} className="text-text-secondary"/>
                </button>
              </section>

              <section className="flex flex-col m-4 gap-2">
                <SidebarLink pathname={pathname} title={"Hangouts"} isOpen={true} icon={<Calendar size={20}/>} onNavigate={() => setIsMobileOpen(false)} />
                <SidebarLink pathname={pathname} title={"Invitations"} isOpen={true} icon={<Bell size={20}/>} onNavigate={() => setIsMobileOpen(false)} />
                <SidebarLink pathname={pathname} title={"Profile"} isOpen={true} icon={<User size={20}/>} onNavigate={() => setIsMobileOpen(false)} />
              </section>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}


type SidebarLinkProps = {
  title: String,
  icon: React.ReactNode,
  pathname: String,
  isOpen: Boolean,
  onNavigate?: () => void,
}

function SidebarLink({pathname, title, isOpen, icon, onNavigate}: SidebarLinkProps) {
  const isActive = pathname.toLocaleLowerCase().split("/").includes(title.toLocaleLowerCase());
  return (
    <Link
      href={`/dashboard/${title.toLocaleLowerCase()}`}
      onClick={onNavigate}
      className={`h-[40px] flex items-center ${isActive ? "bg-bg-active" : "bg-transparent"} transition-all duration-200 hover:cursor-pointer px-3 py-2 rounded-md w-full text-text-primary`}
    >
      <div className={`flex items-center w-full gap-2 ${isActive ? "text-text-active font-medium" : "text-text-secondary"}`}>
        <span className="shrink-0">{icon}</span>
        {isOpen ? <span>{title}</span> : null}
      </div>
    </Link>
  )
}