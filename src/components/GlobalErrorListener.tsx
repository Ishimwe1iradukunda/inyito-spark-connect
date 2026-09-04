import { useEffect } from "react";
import { toast } from "sonner";
import { installGlobalErrorHandlers } from "@/lib/errorLog";

/** Mounts window-level error handlers and surfaces friendly toasts. */
const GlobalErrorListener = () => {
  useEffect(() => {
    let last = 0;
    installGlobalErrorHandlers((message) => {
      const now = Date.now();
      if (now - last < 4000) return; // avoid toast storms
      last = now;
      toast.error(message);
    });
  }, []);

  return null;
};

export default GlobalErrorListener;
