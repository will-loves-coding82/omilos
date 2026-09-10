import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16">
        <section className="">
          <header className="flex flex-col justify-center gap-8 mx-auto text-center">
            <h1 className="text-8xl">Move <br/> Together</h1>
            <p className="max-w-lg mx-auto text-2xl text-text-secondary">Omilos lets you plan and visualize your group hangouts easily.</p>
          </header>
        </section>
      </main>
    </div>
  );
}
