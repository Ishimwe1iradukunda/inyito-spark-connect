import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: Record<string, unknown>) => { close: () => void };
  }
}

const FLW_SCRIPT = "https://checkout.flutterwave.com/v3.js";

function loadFlutterwave(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${FLW_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script")));
      return;
    }
    const script = document.createElement("script");
    script.src = FLW_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("script"));
    document.body.appendChild(script);
  });
}

export interface PayNowButtonProps {
  amount: number;
  currency?: "RWF" | "UGX" | "KES" | "TZS" | "USD";
  email: string;
  name?: string;
  phone?: string;
  description?: string;
  label?: string;
  className?: string;
}

const PayNowButton = ({
  amount,
  currency = "RWF",
  email,
  name,
  phone,
  description,
  label = "Pay Now",
  className,
}: PayNowButtonProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePay = async () => {
    setLoading(true);
    try {
      await loadFlutterwave();

      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { amount, currency, email, name, phone, description },
      });
      if (error || !data?.tx_ref) throw error ?? new Error("init failed");

      window.FlutterwaveCheckout?.({
        public_key: data.public_key,
        tx_ref: data.tx_ref,
        amount: data.amount,
        currency: data.currency,
        // MTN MoMo & Airtel Money (Rwanda / East Africa) + cards
        payment_options: "mobilemoneyrwanda,mobilemoneyuganda,card,mobilemoney,banktransfer",
        customer: { email, name: name ?? email, phone_number: phone ?? "" },
        customizations: {
          title: "inyito.com",
          description: data.description,
        },
        callback: async (response: { transaction_id?: number | string; status?: string }) => {
          try {
            const { data: verification } = await supabase.functions.invoke("verify-payment", {
              body: { transaction_id: response.transaction_id ?? "", tx_ref: data.tx_ref },
            });
            const params = new URLSearchParams({
              tx_ref: data.tx_ref,
              transaction_id: String(response.transaction_id ?? ""),
              amount: String(data.amount),
              currency: data.currency,
            });
            navigate(
              verification?.verified
                ? `/payment-success?${params.toString()}`
                : `/payment-failed?${params.toString()}`,
            );
          } catch {
            navigate(`/payment-failed?tx_ref=${data.tx_ref}`);
          }
        },
        onclose: () => setLoading(false),
      });
    } catch {
      toast.error("Could not start payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Button onClick={handlePay} disabled={loading || !email} size="lg" className={className}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
};

export default PayNowButton;
