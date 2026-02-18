import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const BRAND_COLORS = [
  "hsl(var(--brand-blue))",
  "hsl(var(--brand-green))",
  "hsl(var(--brand-gold))",
  "hsl(var(--brand-purple))",
  "hsl(var(--brand-orange))",
  "hsl(var(--brand-red))",
];

const LETTERS = ["i", "n", "y", "i", "t", "o"];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  life: number;
}

const CTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [gradientIndex, setGradientIndex] = useState(0);

  // Gradient cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setGradientIndex((prev) => (prev + 1) % BRAND_COLORS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Particle confetti
  useEffect(() => {
    if (!isInView) return;
    const createParticles = () => {
      const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        x: 40 + Math.random() * 20,
        y: 80,
        color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
        size: 4 + Math.random() * 6,
        vx: (Math.random() - 0.5) * 4,
        vy: -(4 + Math.random() * 5),
        life: 1,
      }));
      setParticles((prev) => [...prev.slice(-60), ...newParticles]);
    };
    const interval = setInterval(createParticles, 600);
    return () => clearInterval(interval);
  }, [isInView]);

  const currentColor = BRAND_COLORS[gradientIndex];
  const nextColor = BRAND_COLORS[(gradientIndex + 1) % BRAND_COLORS.length];

  return (
    <section
      id="community"
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center py-24 overflow-hidden"
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            `radial-gradient(ellipse at 50% 50%, ${currentColor}20 0%, hsl(var(--background)) 65%)`,
            `radial-gradient(ellipse at 60% 40%, ${nextColor}20 0%, hsl(var(--background)) 65%)`,
          ],
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      {/* Particle confetti */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          animate={{
            x: [0, p.vx * 80],
            y: [0, p.vy * 80],
            opacity: [1, 0],
            scale: [1, 0.3],
          }}
          transition={{ duration: 2.5, ease: "easeOut" }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        {/* Logo re-reveal */}
        <motion.div
          className="flex items-end justify-center gap-1 sm:gap-2 mb-4"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, type: "spring", stiffness: 150 }}
        >
          {LETTERS.map((letter, i) => (
            <motion.span
              key={i}
              className="font-black"
              style={{
                color: BRAND_COLORS[i],
                fontSize: "clamp(3rem, 8vw, 6rem)",
                textShadow: `0 0 30px ${BRAND_COLORS[i]}80`,
              }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
            >
              {letter}
            </motion.span>
          ))}
          <motion.span
            className="text-muted-foreground font-bold self-end pb-2"
            style={{ fontSize: "clamp(1.2rem, 3vw, 2.5rem)" }}
          >
            .com
          </motion.span>
        </motion.div>

        {/* Tagline */}
        <motion.h2
          className="text-2xl sm:text-4xl font-light tracking-widest text-gradient-brand mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ letterSpacing: "0.15em" }}
        >
          The Future is Together
        </motion.h2>

        {/* Description */}
        <motion.p
          className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          Join millions of people across every generation who are already connecting, learning, working,
          trading, celebrating and living on inyito.com.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.1, duration: 0.8 }}
        >
          <motion.button
            className="relative px-10 py-4 rounded-full font-black text-lg text-background overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${BRAND_COLORS[0]}, ${BRAND_COLORS[2]}, ${BRAND_COLORS[3]})`,
              backgroundSize: "200% 200%",
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles size={20} />
              Join inyito.com
            </span>
          </motion.button>

          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 py-4 text-base font-semibold border-border hover:border-primary"
          >
            Learn More
          </Button>
        </motion.div>

        {/* Brand color dots */}
        <motion.div
          className="flex justify-center gap-3 mt-16"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.5 }}
        >
          {BRAND_COLORS.map((color, i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}
            />
          ))}
        </motion.div>

        <motion.p
          className="text-muted-foreground text-sm mt-4 tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.8 }}
        >
          One Platform · Every Generation · All Aspects of Life
        </motion.p>
      </div>
    </section>
  );
};

export default CTASection;
