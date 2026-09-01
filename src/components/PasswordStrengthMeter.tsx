import { motion } from "framer-motion";
import { scorePassword } from "@/lib/authSchemas";

const barColors = [
  "bg-destructive",
  "bg-destructive",
  "bg-[hsl(var(--brand-gold))]",
  "bg-[hsl(var(--brand-blue))]",
  "bg-[hsl(var(--brand-green))]",
];

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  if (!password) return null;
  const { score, label, hints } = scorePassword(password);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{ opacity: i < score ? 1 : 0.25 }}
            className={`h-1 flex-1 rounded-full ${i < score ? barColors[score] : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground" aria-live="polite">
        Strength: <span className="font-semibold text-foreground">{label}</span>
        {hints.length > 0 && <span className="hidden sm:inline"> — {hints[0]}</span>}
      </p>
    </div>
  );
};

export default PasswordStrengthMeter;
