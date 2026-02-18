import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const GENERATIONS = [
  {
    emoji: "👴",
    label: "Grandparent",
    age: "65+",
    action: "Sharing life stories",
    color: "hsl(var(--brand-gold))",
    bg: "hsl(var(--brand-gold) / 0.12)",
    border: "hsl(var(--brand-gold) / 0.3)",
    delay: 0,
  },
  {
    emoji: "👩",
    label: "Parent",
    age: "35–64",
    action: "Managing family life",
    color: "hsl(var(--brand-blue))",
    bg: "hsl(var(--brand-blue) / 0.12)",
    border: "hsl(var(--brand-blue) / 0.3)",
    delay: 0.2,
  },
  {
    emoji: "🧑",
    label: "Teen",
    age: "13–34",
    action: "Learning & creating",
    color: "hsl(var(--brand-purple))",
    bg: "hsl(var(--brand-purple) / 0.12)",
    border: "hsl(var(--brand-purple) / 0.3)",
    delay: 0.4,
  },
  {
    emoji: "👧",
    label: "Child",
    age: "Under 12",
    action: "Playing & discovering",
    color: "hsl(var(--brand-green))",
    bg: "hsl(var(--brand-green) / 0.12)",
    border: "hsl(var(--brand-green) / 0.3)",
    delay: 0.6,
  },
];

const MultiGenerationMontage = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="generations"
      ref={ref}
      className="relative py-28 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 30% 60%, hsl(270 75% 60% / 0.06) 0%, hsl(var(--background)) 60%)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Heading */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl sm:text-5xl font-black mb-4">
            <span className="text-gradient-brand">For Every Generation</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            From grandparents to grandchildren — inyito.com brings every age group together on one platform.
          </p>
        </motion.div>

        {/* Cards + Connecting Lines */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 -translate-y-1/2 z-0">
            <motion.div
              className="w-full h-0.5"
              style={{
                background: "linear-gradient(to right, hsl(var(--brand-gold)), hsl(var(--brand-blue)), hsl(var(--brand-purple)), hsl(var(--brand-green)))",
              }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.8 }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
            {GENERATIONS.map((gen, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 60, scale: 0.8 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: gen.delay, type: "spring", stiffness: 150 }}
              >
                {/* Card */}
                <motion.div
                  className="relative w-full rounded-2xl p-6 border"
                  style={{ background: gen.bg, borderColor: gen.border }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Glow dot at top */}
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-4 border-background"
                    style={{ backgroundColor: gen.color }}
                  />

                  {/* Emoji */}
                  <motion.div
                    className="text-6xl mb-4 mt-2"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                  >
                    {gen.emoji}
                  </motion.div>

                  {/* Label */}
                  <h3 className="text-xl font-bold mb-1" style={{ color: gen.color }}>
                    {gen.label}
                  </h3>
                  <p className="text-muted-foreground text-xs font-medium mb-3">{gen.age}</p>
                  <p className="text-foreground text-sm">{gen.action}</p>

                  {/* Platform icons */}
                  <div className="flex justify-center gap-2 mt-4">
                    {["💬", "📱", "🌐"].map((icon, j) => (
                      <motion.span
                        key={j}
                        className="text-base"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: j * 0.4 + i * 0.2 }}
                      >
                        {icon}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <motion.p
          className="text-center mt-16 text-muted-foreground text-lg max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          No matter your age or stage of life, inyito.com speaks your language and serves your needs.
        </motion.p>
      </div>
    </section>
  );
};

export default MultiGenerationMontage;
