import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const ASPECTS = [
  {
    icon: "💬",
    title: "Social",
    desc: "Connect, share, and build meaningful relationships across all generations.",
    color: "hsl(var(--brand-blue))",
    bg: "hsl(var(--brand-blue) / 0.15)",
    border: "hsl(var(--brand-blue) / 0.35)",
    delay: 0,
  },
  {
    icon: "🛒",
    title: "Commerce",
    desc: "Buy, sell, and trade locally or globally with trusted community members.",
    color: "hsl(var(--brand-orange))",
    bg: "hsl(var(--brand-orange) / 0.15)",
    border: "hsl(var(--brand-orange) / 0.35)",
    delay: 0.1,
  },
  {
    icon: "📚",
    title: "Learning",
    desc: "Discover courses, share knowledge, and grow skills at any age.",
    color: "hsl(var(--brand-green))",
    bg: "hsl(var(--brand-green) / 0.15)",
    border: "hsl(var(--brand-green) / 0.35)",
    delay: 0.2,
  },
  {
    icon: "💼",
    title: "Work",
    desc: "Find opportunities, collaborate, and build your professional journey.",
    color: "hsl(var(--brand-gold))",
    bg: "hsl(var(--brand-gold) / 0.15)",
    border: "hsl(var(--brand-gold) / 0.35)",
    delay: 0.3,
  },
  {
    icon: "🎉",
    title: "Events",
    desc: "Plan, discover, and attend events that matter to you and your community.",
    color: "hsl(var(--brand-purple))",
    bg: "hsl(var(--brand-purple) / 0.15)",
    border: "hsl(var(--brand-purple) / 0.35)",
    delay: 0.4,
  },
  {
    icon: "❤️",
    title: "Family",
    desc: "Keep your loved ones close with tools designed for family life.",
    color: "hsl(var(--brand-red))",
    bg: "hsl(var(--brand-red) / 0.15)",
    border: "hsl(var(--brand-red) / 0.35)",
    delay: 0.5,
  },
];

const LifeAspectsShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [activeCard, setActiveCard] = useState<number | null>(null);

  return (
    <section
      id="features"
      ref={ref}
      className="relative py-28 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 70% 30%, hsl(45 95% 55% / 0.06) 0%, hsl(var(--background)) 60%)",
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
            <span className="text-gradient-brand">Every Aspect of Life</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            inyito.com is not just an app — it's the full spectrum of human experience, all in one place.
          </p>
        </motion.div>

        {/* Tiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ASPECTS.map((aspect, i) => (
            <motion.div
              key={i}
              className="relative rounded-2xl p-8 border cursor-pointer overflow-hidden"
              style={{
                background: aspect.bg,
                borderColor: activeCard === i ? aspect.color : aspect.border,
                boxShadow: activeCard === i ? `0 0 30px ${aspect.color}40` : "none",
              }}
              initial={{ opacity: 0, y: 50, rotateX: 20 }}
              animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{ duration: 0.6, delay: aspect.delay, type: "spring", stiffness: 120 }}
              whileHover={{ scale: 1.04, y: -6 }}
              onHoverStart={() => setActiveCard(i)}
              onHoverEnd={() => setActiveCard(null)}
            >
              {/* Background glow on hover */}
              {activeCard === i && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${aspect.color}20 0%, transparent 70%)`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Icon */}
              <motion.div
                className="text-5xl mb-4"
                animate={
                  activeCard === i
                    ? { scale: [1, 1.3, 1.1], rotate: [0, -10, 10, 0] }
                    : { scale: 1, rotate: 0 }
                }
                transition={{ duration: 0.5 }}
              >
                {aspect.icon}
              </motion.div>

              {/* Title */}
              <h3 className="text-2xl font-black mb-2" style={{ color: aspect.color }}>
                {aspect.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed">{aspect.desc}</p>

              {/* Bottom accent line */}
              <motion.div
                className="absolute bottom-0 left-0 h-1 rounded-b-2xl"
                style={{ background: aspect.color }}
                initial={{ width: "0%" }}
                animate={isInView ? { width: activeCard === i ? "100%" : "30%" } : {}}
                transition={{ duration: activeCard === i ? 0.3 : 1, delay: activeCard === i ? 0 : aspect.delay + 0.5 }}
              />
            </motion.div>
          ))}
        </div>

        {/* Centre connecting text */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.2 }}
        >
          <p className="text-muted-foreground text-base max-w-2xl mx-auto">
            All domains work together seamlessly — because life doesn't fit into categories.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default LifeAspectsShowcase;
