import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Users, Video, Globe, Zap } from "lucide-react";

const STATS = [
  { icon: Users, label: "Active Creators", value: 12400, suffix: "+", color: "hsl(var(--brand-blue))" },
  { icon: Video, label: "Videos Created", value: 58000, suffix: "+", color: "hsl(var(--brand-purple))" },
  { icon: Globe, label: "Countries", value: 140, suffix: "+", color: "hsl(var(--brand-green))" },
  { icon: Zap, label: "Avg. Edit Time", value: 3, suffix: " min", color: "hsl(var(--brand-gold))" },
];

function AnimatedCounter({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  const formatted = value >= 1000 ? `${(count / 1000).toFixed(count >= value ? 1 : 0)}k` : count.toString();
  return <span>{formatted}{suffix}</span>;
}

const StatsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 overflow-hidden">
      {/* Subtle gradient backdrop */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, hsl(var(--brand-purple) / 0.15) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <motion.h2
          className="text-center text-2xl sm:text-3xl font-black mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-gradient-brand">Trusted by Creators Worldwide</span>
        </motion.h2>
        <motion.p
          className="text-center text-muted-foreground text-sm mb-12 max-w-lg mx-auto"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.2 }}
        >
          From first-time streamers to professional content creators — inyito powers it all.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="card-glass rounded-2xl p-6 text-center group hover:border-primary/30 transition-colors"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                whileHover={{ y: -4 }}
              >
                <div
                  className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 transition-shadow group-hover:shadow-lg"
                  style={{ backgroundColor: `${stat.color}20`, boxShadow: `0 0 0px ${stat.color}` }}
                >
                  <Icon size={22} style={{ color: stat.color }} />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} inView={isInView} />
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
