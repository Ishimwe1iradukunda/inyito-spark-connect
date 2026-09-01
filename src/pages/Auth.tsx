import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import { signInSchema, signUpSchema, resetRequestSchema } from "@/lib/authSchemas";
import { LogIn, UserPlus, ArrowRight, Eye, EyeOff, Loader2, MailCheck, ShieldCheck } from "lucide-react";

type Mode = "signin" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, requestPasswordReset, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/studio";

  useEffect(() => {
    if (!authLoading && user) navigate(redirectTo, { replace: true });
  }, [user, authLoading, navigate, redirectTo]);

  const resetMessages = () => {
    setErrors({});
    setFormError("");
    setSuccess("");
  };

  const validate = () => {
    const schema = mode === "signup" ? signUpSchema : mode === "signin" ? signInSchema : resetRequestSchema;
    const payload =
      mode === "signup" ? { displayName, email, password } : mode === "signin" ? { email, password } : { email };
    const parsed = schema.safeParse(payload);
    if (parsed.success) return true;
    const next: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (next[String(i.path[0])] = i.message));
    setErrors(next);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!validate()) return;

    setLoading(true);
    if (mode === "signup") {
      const { error } = await signUp(email, password, displayName);
      if (error) setFormError(error.message);
      else navigate(redirectTo, { replace: true });
    } else if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) setFormError(error.message);
      else navigate(redirectTo, { replace: true });
    } else {
      const { error } = await requestPasswordReset(email);
      if (error) setFormError(error.message);
      else setSuccess("If that email exists, a reset link is on its way.");
    }
    setLoading(false);
  };

  const titles: Record<Mode, { title: string; sub: string }> = {
    signin: { title: "Welcome Back", sub: "Sign in to access your recordings" },
    signup: { title: "Create Account", sub: "Sign up to save recordings to the cloud" },
    forgot: { title: "Reset Password", sub: "We'll email you a secure reset link" },
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <NavBar />
      <main className="pt-24 pb-16 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm sm:max-w-md card-glass rounded-2xl p-6 sm:p-8"
        >
          <h1 className="text-xl sm:text-2xl font-black text-center mb-1">{titles[mode].title}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm text-center mb-6">{titles[mode].sub}</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    aria-invalid={!!errors.displayName}
                    placeholder="Your name"
                  />
                  {errors.displayName && <p className="text-destructive text-xs">{errors.displayName}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        resetMessages();
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                    className="pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {mode === "signup" && <PasswordStrengthMeter password={password} />}
                {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
              </div>
            )}

            {formError && (
              <p className="text-destructive text-xs bg-destructive/10 rounded-md px-3 py-2" role="alert">
                {formError}
              </p>
            )}
            {success && (
              <p className="text-primary text-xs bg-primary/10 rounded-md px-3 py-2 flex items-center gap-2">
                <MailCheck size={14} /> {success}
              </p>
            )}

            <Button type="submit" className="w-full gap-2 glow-blue font-bold" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === "signup" ? (
                <UserPlus size={16} />
              ) : mode === "signin" ? (
                <LogIn size={16} />
              ) : (
                <MailCheck size={16} />
              )}
              {loading
                ? "Please wait..."
                : mode === "signup"
                  ? "Sign Up"
                  : mode === "signin"
                    ? "Sign In"
                    : "Send reset link"}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-center">
            {mode === "forgot" ? (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setMode("signin");
                  resetMessages();
                }}
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  resetMessages();
                }}
              >
                {mode === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                <ArrowRight size={12} className="inline ml-1" />
              </button>
            )}
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck size={11} />
              Passwords are bcrypt-hashed; sessions use signed JWTs
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Auth;
