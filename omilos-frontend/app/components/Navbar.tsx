'use client'

import Link from "next/link";
import "../globals.css";
import { UserButton, useUser } from '@clerk/nextjs'
import Skeleton from "./Skeleton";

export default function Navbar() {

  return (
    <nav className="bg-bg-secondary h-[64px] m-4 rounded-xl w-full max-w-7xl mx-auto sticky">
      <div className="flex justify-between items-center w-full h-full max-w-6xl mx-auto">
        <section id="logo">
          <Link href="/" className="text-text-primary font-medium text-xl">Omilos</Link>
        </section>
        <section id="links"></section>
        <AuthGroup/>
      </div>
    </nav>
  )
}

function AuthGroup() {
  const { isSignedIn, user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div className="w-[140px]"><Skeleton size="sm"/></div>
  }

  return (
    <>
      {isSignedIn ? 
        <section id="auth" className="flex gap-4">
          <UserButton/>
          <Link href="/dashboard" className="text-text-primary">Dashboard</Link>
        </section>
        :
        <section id="auth" className="flex gap-8">
          <Link href="/sign-in" className="text-text-primary">Log in</Link>
          <Link href="/sign-up" className="text-text-primary">Sign up</Link>
        </section>
      }
    </>
  )
}

