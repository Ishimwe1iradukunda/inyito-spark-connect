import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobalErrorListener from "@/components/GlobalErrorListener";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import Index from "./pages/Index";
import Studio from "./pages/Studio";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import MyRecordings from "./pages/MyRecordings";
import Templates from "./pages/Templates";
import Profile from "./pages/Profile";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <GlobalErrorListener />
        <BrowserRouter>
          <AuthProvider>
            <PWAInstallPrompt />
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-failed" element={<PaymentFailed />} />
            <Route
              path="/my-recordings"
              element={
                <ProtectedRoute>
                  <MyRecordings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
