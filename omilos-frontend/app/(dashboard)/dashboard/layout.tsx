import SidebarClient from "./components/SidebarClient";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <section className="flex w-full h-[100vh]">
      <SidebarClient/>
      {children}
    </section>
  )
}
