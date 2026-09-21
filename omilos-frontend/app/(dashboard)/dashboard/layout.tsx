import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SidebarServer } from "./components/sidebar-server";
import { HeaderActionsProvider } from "./components/context/header-actions-context";
import { BreadCrumbHeader } from "./components/bread-crumb-header";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return (
    <section className="flex w-full h-[100vh]">
      <HeaderActionsProvider>
        <SidebarServer>
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <BreadCrumbHeader />
            <main className="flex-1 overflow-auto min-h-0" style={{scrollbarWidth: "none", overflowX: "hidden"}}>{children}</main>
          </div>
        </SidebarServer>
      </HeaderActionsProvider>
    </section>
  )
}
