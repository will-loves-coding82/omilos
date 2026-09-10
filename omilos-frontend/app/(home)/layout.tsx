import Navbar from "../components/Navbar";
import Image from "next/image";

export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar/>
      {children}
    </>

  );
}
