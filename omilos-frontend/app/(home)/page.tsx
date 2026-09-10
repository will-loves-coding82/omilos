import Image from "next/image";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <>
      <section id="hero" data-nav-theme="dark" className="flex flex-col items-start justify-center bg-bg-success h-180">
          <header className="flex flex-col justify-center gap-8 mx-auto text-center ">
            <h1 className="text-8xl text-white">Move <br /> Together</h1>
            <p className="max-w-lg mx-auto text-2xl text-white">Omilos lets you plan and visualize your group hangouts easily.</p>
          </header>
      </section>

      <section id="features" data-nav-theme="light" className="flex flex-col w-full max-w-6xl mx-auto py-32">
        <article className="w-full flex flex-col gap-8 justify-between">
            <h2 className="text-3xl font-medium">Plan your stops with Mapbox</h2>
            <picture className="relative w-full h-[750px] rounded-xl border-1 border-border-primary">
              <Image src="/preview1.png" alt="preview image 1" fill priority className="object-cover rounded-xl"/>
            </picture>
            <p className="text-text-secondary max-w-4xl">
              As a host, scout your group's next destination and make it visible for everyone to see in a unified interface. No more context switching between different chat rooms and applications.
            </p>
        </article>
      </section>

    </>
  );
}
