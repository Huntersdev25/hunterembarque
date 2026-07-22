import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { MetricsSection } from "@/components/landing/MetricsSection";
import { PainPointsSection } from "@/components/landing/PainPointsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TechDifferentialsSection } from "@/components/landing/TechDifferentialsSection";
import { ForCompaniesSection } from "@/components/landing/ForCompaniesSection";
import { ForProfessionalsSection } from "@/components/landing/ForProfessionalsSection";
import { InstitutionalSection } from "@/components/landing/InstitutionalSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <HeroSection />
      <MetricsSection />
      <PainPointsSection />
      <HowItWorksSection />
      <TechDifferentialsSection />
      <ForCompaniesSection />
      <ForProfessionalsSection />
      <InstitutionalSection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
};

export default Index;
