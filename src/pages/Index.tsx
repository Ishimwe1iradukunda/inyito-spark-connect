import { useState } from "react";
import NavBar from "@/components/NavBar";
import LogoReveal from "@/components/scenes/LogoReveal";
import GlobalConnectionWeb from "@/components/scenes/GlobalConnectionWeb";
import MultiGenerationMontage from "@/components/scenes/MultiGenerationMontage";
import LifeAspectsShowcase from "@/components/scenes/LifeAspectsShowcase";
import StatsSection from "@/components/StatsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";
import SiteFooter from "@/components/SiteFooter";
import CinemaMode from "@/components/CinemaMode";
import { motion } from "framer-motion";
import { Video, Clapperboard } from "lucide-react";

const Index = () => {
  const [cinemaOpen, setCinemaOpen] = useState(false);

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      {/* Cinema Mode Overlay */}
      {cinemaOpen && <CinemaMode onClose={() => setCinemaOpen(false)} />}

      <NavBar />

      {/* Floating Cinema Button */}
      <motion.button
        onClick={() => setCinemaOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm text-background shadow-2xl"
        style={{ background: "linear-gradient(135deg, hsl(var(--brand-blue)), hsl(var(--brand-purple)))" }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        title="Open Cinema Mode to record a promo video"
      >
        <Clapperboard size={18} />
        <span className="hidden sm:inline">Record Promo</span>
      </motion.button>

      {/* Cinema tip banner */}
      <motion.div
        className="fixed bottom-20 right-6 z-40 max-w-xs rounded-xl border border-border bg-card/90 backdrop-blur-md p-4 shadow-xl"
        initial={{ opacity: 0, x: 80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 3.5, duration: 0.6 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex items-start gap-3">
          <Video size={20} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">🎬 Ready to promote?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click <strong>Record Promo</strong> to open Cinema Mode — a full-screen auto-playing presentation you can screen-record for social media.
            </p>
          </div>
        </div>
      </motion.div>

      <main>
        <LogoReveal />
        <GlobalConnectionWeb />
        <StatsSection />
        <MultiGenerationMontage />
        <LifeAspectsShowcase />
        <TestimonialsSection />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
