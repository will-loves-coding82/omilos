import Navbar from "../components/Navbar";

export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
