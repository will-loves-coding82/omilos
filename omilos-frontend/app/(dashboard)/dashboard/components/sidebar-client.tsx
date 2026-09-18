"use client";


import { Calendar, User, PanelLeft, Bell, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ClientInvite } from "@/app/types/client-types";

export type SidebarClientProps = {
  pendingInviteCount: number
}

export default function SidebarClient({pendingInviteCount} : SidebarClientProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Expose the sidebar's current width as a CSS variable so overlays
  // rendered elsewhere (e.g. the map's search box) can offset around it
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');

    const updateSidebarWidth = () => {
      document.documentElement.style.setProperty(
        '--sidebar-width',
        mediaQuery.matches ? (isOpen ? '224px' : '80px') : '0px'
      );
    };

    updateSidebarWidth();
    mediaQuery.addEventListener('change', updateSidebarWidth);

    return () => mediaQuery.removeEventListener('change', updateSidebarWidth);
  }, [isOpen]);

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-40 bg-bg-primary shadow-md rounded-lg p-2 text-text-primary hover:cursor-pointer"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={20} className="text-text-secondary" />
      </button>

      <nav className={`hidden md:flex flex-col h-full relative z-20 ${isOpen ? "min-w-[224px]": "min-w-[80px]"} bg-bg-primary shadow-md transition-all duration-300`}>
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
            <SidebarLink pathname={pathname} title={"Events"} isOpen={isOpen} icon={<Calendar size={20}/>} />
            <SidebarLink badgeCount={pendingInviteCount} pathname={pathname} title={"Invitations"} isOpen={isOpen} icon={<Bell size={20}/>} />
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
                <SidebarLink pathname={pathname} title={"Events"} isOpen={true} icon={<Calendar size={20}/>} onNavigate={() => setIsMobileOpen(false)} />
                <SidebarLink badgeCount={pendingInviteCount} pathname={pathname} title={"Invitations"} isOpen={true} icon={<Bell size={20}/>} onNavigate={() => setIsMobileOpen(false)} />
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
  title: string,
  icon: React.ReactNode,
  pathname: string,
  isOpen: boolean,
  badgeCount?: number,
  onNavigate?: () => void,
}

function SidebarLink({pathname, title, isOpen, icon, badgeCount, onNavigate}: SidebarLinkProps) {
  const isActive = pathname.toLocaleLowerCase().split("/").includes(title.toLocaleLowerCase());
  return (
    <Link
      href={`/dashboard/${title.toLocaleLowerCase()}`}
      onClick={onNavigate}
      className={`h-[45px] flex items-center ${isActive ? "bg-bg-active" : "bg-transparent"} transition-all duration-200 hover:cursor-pointer px-3 py-2 rounded-md w-full text-text-primary`}
    >
      <div className={`flex items-center w-full gap-2 ${isActive ? "text-text-active font-medium" : "text-text-secondary"}`}>
        <span className="shrink-0">
          <SidebarBadge count={badgeCount} isActive={isActive} />
          {icon}
        </span>
        {isOpen ? <span>{title}</span> : null}
      </div>
    </Link>
  )
}

type SidebarBadgeProps = {
  count?: number,
  isActive?: boolean,
}

function SidebarBadge({count, isActive}: SidebarBadgeProps) {
  if (!count || count <= 0) return null;

  return (
    <p className={`h-[18px] w-[18px] absolute border-box translate-x-[9px] translate-y-[-10px] flex justify-center items-center border-2 ${isActive ? "border-bg-active" : "border-badge-border"} bg-badge-bg rounded-full text-[10px] text-badge-text`}>
      {count}
    </p>
  )
}