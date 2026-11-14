import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConfigureAmplify } from "./providers/configure-amplify";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Omilos",
  description: "The social event planner app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          {/* Inside ClerkProvider so Amplify can use the Clerk session token */}
          <ConfigureAmplify />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
