import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SidebarServer } from "./components/sidebar-server";
import { HeaderActionsProvider } from "./components/context/header-actions-context";
import { Header } from "./components/header";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return (
    <section className="flex w-full h-[100vh]">
      <HeaderActionsProvider>
        <SidebarServer/>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto min-h-0">{children}</main>
        </div>
      </HeaderActionsProvider>
    </section>
  )
}
