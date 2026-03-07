import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Content Creator",
    text: "inyito transformed how I create tutorials. The real-time editing is incredibly smooth — I save hours every week.",
    avatar: "SC",
    color: "hsl(var(--brand-blue))",
  },
  {
    name: "Marcus Johnson",
    role: "Online Educator",
    text: "The best screen recording tool I've used. Filters, text overlays, keyframe animations — all in the browser. Absolutely game-changing.",
    avatar: "MJ",
    color: "hsl(var(--brand-purple))",
  },
  {
    name: "Aisha Patel",
    role: "Freelance Designer",
    text: "I love that I can record, edit, and share without leaving the app. The PWA works offline too — perfect for client presentations.",
    avatar: "AP",
    color: "hsl(var(--brand-green))",
  },
  {
    name: "Carlos Rivera",
    role: "Product Manager",
    text: "We switched our entire team's demo workflow to inyito. The cloud save feature is a lifesaver for async collaboration.",
    avatar: "CR",
    color: "hsl(var(--brand-gold))",
  },
];

const TestimonialsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const timer = setInterval(() => setActive((p) => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(timer);
  }, [isInView]);

  const prev = () => setActive((p) => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => setActive((p) => (p + 1) % TESTIMONIALS.length);

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          className="text-center text-2xl sm:text-3xl font-black mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="text-gradient-brand">What Creators Say</span>
        </motion.h2>

        <motion.div
          className="relative card-glass rounded-2xl p-8 sm:p-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.2 }}
        >
          {/* Stars */}
          <div className="flex gap-1 mb-4 justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} className="fill-brand-gold text-brand-gold" style={{ color: "hsl(var(--brand-gold))", fill: "hsl(var(--brand-gold))" }} />
            ))}
          </div>

          {/* Quote */}
          <motion.p
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-lg sm:text-xl text-foreground/90 leading-relaxed mb-6 min-h-[4rem]"
          >
            "{TESTIMONIALS[active].text}"
          </motion.p>

          {/* Author */}
          <motion.div
            key={`author-${active}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-background"
              style={{ backgroundColor: TESTIMONIALS[active].color }}
            >
              {TESTIMONIALS[active].avatar}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{TESTIMONIALS[active].name}</p>
              <p className="text-xs text-muted-foreground">{TESTIMONIALS[active].role}</p>
            </div>
          </motion.div>

          {/* Nav arrows */}
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={18} />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === active ? "w-6 bg-primary" : "bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
