import { DashboardHome } from "@/components/dashboard";
import { Navigation } from "@/components/navigation";
import { AmbientBackground } from "@/components/motion-shell";

export default function DashboardPage() {
  return (
    <>
      <AmbientBackground />
      <Navigation />
      <DashboardHome />
    </>
  );
}
