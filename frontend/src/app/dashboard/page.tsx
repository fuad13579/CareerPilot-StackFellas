import { DashboardHome } from "@/components/dashboard";
import { Navigation } from "@/components/navigation";
import { AmbientBackground, ClientOnly } from "@/components/motion-shell";

export default function DashboardPage() {
  return (
    <>
      <ClientOnly>
        <AmbientBackground />
      </ClientOnly>
      <Navigation />
      <DashboardHome />
    </>
  );
}
