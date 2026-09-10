'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import "../globals.css";
import { UserButton, useUser } from '@clerk/nextjs'
import Skeleton from "./Skeleton";

const NAV_HEIGHT = 64;

export default function NavbarClient() {
  const [onDark, setOnDark] = useState(true);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-nav-theme]")
    );
    if (sections.length === 0) return;

    const handleScroll = () => {
      const probeY = NAV_HEIGHT / 2;
      const current = sections.find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= probeY && rect.bottom > probeY;
      });
      if (current) {
        setOnDark(current.dataset.navTheme === "dark");
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`bg-bg-secondary/30 backdrop-blur-md h-[64px] m-4 rounded-xl w-[calc(100%-2rem)] max-w-7xl mx-auto fixed top-0 left-0 right-0 z-100 transition-colors ${
        onDark ? "text-white" : "text-text-primary"
      }`}
    >
      <div className="flex justify-between items-center w-full h-full max-w-6xl mx-auto">
        <section id="logo">
          <Link href="/" className="font-medium text-xl">Omilos</Link>
        </section>
        <section id="links"></section>
        <AuthGroup/>
      </div>
    </nav>
  )
}

function AuthGroup() {
  const { isSignedIn, isLoaded } = useUser()

  if (!isLoaded) {
    return <div className="w-[140px]"><Skeleton size="sm"/></div>
  }

  return (
    <>
      {isSignedIn ? 
        <section id="auth" className="flex gap-4">
          <UserButton/>
          <Link href="/dashboard/hangouts">Dashboard</Link>
        </section>
        :
        <section id="auth" className="flex gap-8">
          <Link href="/sign-in">Log in</Link>
          <Link href="/sign-up">Sign up</Link>
        </section>
      }
    </>
  )
}

