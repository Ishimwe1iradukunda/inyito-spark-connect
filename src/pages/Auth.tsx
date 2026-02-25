import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import { LogIn, UserPlus, ArrowRight } from "lucide-react";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName);
      if (error) setError(error.message);
      else setSuccess("Check your email to confirm your account!");
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else navigate("/studio");
    }
    setLoading(false);
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <NavBar />
      <main className="pt-24 pb-16 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm card-glass rounded-2xl p-8"
        >
          <h1 className="text-2xl font-black text-center mb-1">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {isSignUp ? "Sign up to save recordings to the cloud" : "Sign in to access your recordings"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && <p className="text-destructive text-xs">{error}</p>}
            {success && <p className="text-primary text-xs">{success}</p>}

            <Button type="submit" className="w-full gap-2 glow-blue font-bold" disabled={loading}>
              {isSignUp ? <UserPlus size={16} /> : <LogIn size={16} />}
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              <ArrowRight size={12} className="inline ml-1" />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Auth;
