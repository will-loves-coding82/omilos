import NavbarClient from "../components/navbar-client";

export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <NavbarClient/>
      {children}
    </>

  );
}
