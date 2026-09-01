import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NavBar from "@/components/NavBar";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import { useAuth } from "@/contexts/AuthContext";
import { newPasswordSchema } from "@/lib/authSchemas";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || session) setRecoveryReady(true);
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = newPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (next[String(i.path[0])] = i.message));
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);
    if (error) {
      setErrors({ password: error.message });
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate("/studio", { replace: true });
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <NavBar />
      <main className="pt-24 pb-16 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md card-glass rounded-2xl p-6 sm:p-8"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-secondary">
              <KeyRound size={20} />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-center mb-1">Set a new password</h1>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {recoveryReady
              ? "Choose a strong password you haven't used before."
              : "Open this page from the reset link in your email."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordStrengthMeter password={password} />
              {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={!!errors.confirm}
                placeholder="••••••••"
              />
              {errors.confirm && <p className="text-destructive text-xs">{errors.confirm}</p>}
            </div>

            <Button type="submit" className="w-full gap-2 glow-blue font-bold" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {saving ? "Updating..." : "Update password"}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default ResetPassword;
