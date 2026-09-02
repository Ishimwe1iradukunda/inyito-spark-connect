import { Link, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { motion } from "framer-motion";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";

const PaymentFailed = () => {
  const [params] = useSearchParams();
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
          <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Payment not completed</h1>
          <p className="mt-2 text-muted-foreground">
            We could not confirm your payment. No money has been taken if the transaction failed.
          </p>
          {txRef && (
            <p className="mt-4 rounded-xl bg-muted/40 p-3 text-xs font-mono break-all">
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
