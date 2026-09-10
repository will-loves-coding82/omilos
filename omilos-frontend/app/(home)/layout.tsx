import NavbarClient from "../components/NavbarClient";

export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <NavbarClient/>
      {children}
    </>

  );
}
