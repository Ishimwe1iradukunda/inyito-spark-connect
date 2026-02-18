import NavBar from "@/components/NavBar";
import LogoReveal from "@/components/scenes/LogoReveal";
import GlobalConnectionWeb from "@/components/scenes/GlobalConnectionWeb";
import MultiGenerationMontage from "@/components/scenes/MultiGenerationMontage";
import LifeAspectsShowcase from "@/components/scenes/LifeAspectsShowcase";
import CTASection from "@/components/CTASection";
import SiteFooter from "@/components/SiteFooter";

const Index = () => {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <NavBar />
      <main>
        <LogoReveal />
        <GlobalConnectionWeb />
        <MultiGenerationMontage />
        <LifeAspectsShowcase />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
