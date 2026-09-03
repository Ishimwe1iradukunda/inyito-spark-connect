import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const LETTERS = ["i", "n", "y", "i", "t", "o"];
const LETTER_COLORS = [
  "hsl(var(--brand-blue))",
  "hsl(var(--brand-green))",
  "hsl(var(--brand-gold))",
  "hsl(var(--brand-purple))",
  "hsl(var(--brand-orange))",
  "hsl(var(--brand-red))",
];

const TAGLINE = "The Future is Together";

const LogoReveal = () => {
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    let i = 0;
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setTypedText(TAGLINE.slice(0, i));
        if (i >= TAGLINE.length) clearInterval(interval);
      }, 60);
      return () => clearInterval(interval);
    }, 1800);
    return () => clearTimeout(delay);
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at center, hsl(240 30% 10%) 0%, hsl(var(--background)) 70%)",
      }}
    >
      {/* Particle dots */}
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: LETTER_COLORS[i % LETTER_COLORS.length],
          }}
          animate={{
            opacity: [0, 0.7, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Glowing rings */}
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full border"
          style={{
            width: `${ring * 220}px`,
            height: `${ring * 220}px`,
            borderColor: `${LETTER_COLORS[ring - 1]}30`,
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3 + ring, repeat: Infinity, delay: ring * 0.5 }}
        />
      ))}

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-end gap-1 sm:gap-2 mb-6">
          {LETTERS.map((letter, i) => (
            <motion.span
              key={i}
              className="font-black leading-none select-none"
              style={{
                color: LETTER_COLORS[i],
                fontSize: "clamp(4rem, 12vw, 9rem)",
                textShadow: `0 0 40px ${LETTER_COLORS[i]}80`,
              }}
              initial={{ opacity: 0, y: 60, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.7,
                delay: i * 0.15,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
            >
              {letter}
            </motion.span>
          ))}
          <motion.span
            className="text-muted-foreground font-bold"
            style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)", marginBottom: "0.5rem" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            .com
          </motion.span>
        </div>

        {/* Tagline Typewriter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="text-center"
        >
          <p
            className="text-xl sm:text-3xl font-light tracking-widest text-gradient-brand min-h-[2rem]"
            style={{ letterSpacing: "0.2em" }}
          >
            {typedText}
            <span className="animate-pulse opacity-70">|</span>
          </p>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.2, duration: 0.8 }}
          className="mt-6 text-muted-foreground text-center text-base sm:text-lg max-w-lg px-4"
        >
          One platform. Every generation. All aspects of life — connected.
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          className="mt-16 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4, duration: 1 }}
        >
          <span className="text-muted-foreground text-xs tracking-widest uppercase">Scroll to explore</span>
          <motion.div
            className="w-0.5 h-10 rounded-full"
            style={{ background: "linear-gradient(to bottom, hsl(var(--brand-blue)), transparent)" }}
            animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default LogoReveal;
