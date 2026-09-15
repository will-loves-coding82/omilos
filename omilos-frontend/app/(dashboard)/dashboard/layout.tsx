import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SidebarServer } from "./components/SidebarServer";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return (
    <section className="flex w-full h-[100vh]">
      <SidebarServer/>
        {children}
    </section>
  )
}
