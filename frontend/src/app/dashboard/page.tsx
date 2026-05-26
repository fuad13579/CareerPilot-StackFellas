import { PortfolioHome } from "@/components/portfolio";
import { Navigation } from "@/components/navigation";
import { AmbientBackground } from "@/components/motion-shell";

export default function DashboardPage() {
  return (
    <>
      <AmbientBackground />
      <Navigation />
      <PortfolioHome />
    </>
  );
}
