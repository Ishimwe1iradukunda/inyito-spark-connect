import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session or already installed
    if (sessionStorage.getItem("pwa-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after a delay so it doesn't interrupt
      setTimeout(() => setShowBanner(true), 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setShowBanner(false);
    sessionStorage.setItem("pwa-dismissed", "true");
  }, []);

  return (
    <AnimatePresence>
      {showBanner && !dismissed && (
        <motion.div
          initial={{ y: 120, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 120, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl">
            {/* Animated gradient border glow */}
            <div className="absolute inset-0 rounded-2xl opacity-40 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, hsl(var(--brand-blue) / 0.3), hsl(var(--brand-purple) / 0.3), hsl(var(--brand-gold) / 0.3))",
              }}
            />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>

            <div className="relative p-5">
              {/* Header with icon */}
              <div className="flex items-start gap-4">
                <motion.div
                  className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--brand-blue)), hsl(var(--brand-purple)))",
                  }}
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                >
                  <Smartphone size={28} className="text-foreground" />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-brand-gold" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Get the App
                    </p>
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-1">
                    Install inyito
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Quick access from your home screen. Works offline, loads instantly.
                  </p>
                </div>
              </div>

              {/* Install button */}
              <motion.div className="mt-4" whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full h-11 rounded-xl font-bold text-sm gap-2"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--brand-blue)), hsl(var(--brand-purple)))",
                  }}
                >
                  <Download size={16} />
                  {installing ? "Installing…" : "Install Now — It's Free"}
                </Button>
              </motion.div>

              <p className="text-center text-[11px] text-muted-foreground mt-2.5 opacity-70">
                No app store needed • Takes 2 seconds
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
