import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { XCircle, LifeBuoy } from "lucide-react";
import { motion } from "framer-motion";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/errorLog";

const REASONS: Record<string, string> = {
  cancelled: "You closed the payment window before it finished. Nothing was charged.",
  declined: "Your bank or mobile money provider declined the payment. Try another method.",
  insufficient: "There wasn't enough balance to complete this payment.",
  network: "We lost connection while confirming the payment. If money left your account, contact us with the reference below.",
  unverified: "We couldn't confirm this payment yet. If money left your account, it will be reversed or confirmed shortly.",
};

const PaymentFailed = () => {
  const [params] = useSearchParams();
  const txRef = params.get("tx_ref");
  const reasonKey = params.get("reason") ?? "unverified";
  const status = params.get("status");

  const reason = REASONS[reasonKey] ?? REASONS.unverified;

  useEffect(() => {
    logError("payment", `Payment not completed: ${reasonKey}`, { txRef, status });
  }, [reasonKey, txRef, status]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="flex min-h-screen items-center justify-center px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl"
        >
          <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Payment not completed</h1>
          <p className="mt-2 text-muted-foreground">{reason}</p>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-left text-xs text-muted-foreground">
            <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Keep this reference if you need help — it lets us find your transaction instantly.
            </span>
          </div>

          {txRef && (
            <p className="mt-3 rounded-xl bg-muted/40 p-3 text-xs font-mono break-all">
              Reference: {txRef}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button asChild className="flex-1">
              <Link to="/checkout">Try again</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default PaymentFailed;
