import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const transactionId = params.get("transaction_id");
  const amount = params.get("amount");
  const currency = params.get("currency");
  const txRef = params.get("tx_ref");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="flex min-h-screen items-center justify-center px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl"
        >
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h1 className="text-2xl font-bold">Payment successful</h1>
          <p className="mt-2 text-muted-foreground">
            Thank you — your payment has been confirmed.
          </p>

          <dl className="mt-6 space-y-2 rounded-xl bg-muted/40 p-4 text-left text-sm">
            {amount && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-semibold">
                  {amount} {currency}
                </dd>
              </div>
            )}
            {transactionId && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Transaction ID</dt>
                <dd className="font-mono">{transactionId}</dd>
              </div>
            )}
            {txRef && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="truncate font-mono">{txRef}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex gap-3">
            <Button asChild className="flex-1">
              <Link to="/">Back to home</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/studio">Go to Studio</Link>
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default PaymentSuccess;
