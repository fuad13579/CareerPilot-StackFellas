import type { Metadata } from "next";
import { AmbientBackground } from "@/components/motion-shell";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerPilot",
  description: "CareerPilot frontend application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#FAFAFA] text-[#111827]">
        <AmbientBackground />
        <div className="min-h-screen">
          <Navigation />
          <main className="min-w-0 px-5 pb-16 pt-24 sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
