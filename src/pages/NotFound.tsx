import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass, Home } from "lucide-react";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/errorLog";

const SUGGESTIONS = [
  { to: "/", label: "Home" },
  { to: "/studio", label: "Studio" },
  { to: "/templates", label: "Templates" },
  { to: "/checkout", label: "Pay Now" },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logError("route", `Broken link: ${location.pathname}${location.search}`, {
      referrer: document.referrer,
    });
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="flex min-h-[80vh] items-center justify-center px-4 py-24">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <Compass className="mx-auto mb-4 h-14 w-14 text-primary" />
          <h1 className="text-2xl font-bold">We couldn't find that page</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may be old or mistyped. Here's where you can go instead:
          </p>
          <p className="mt-4 rounded-lg bg-muted/40 p-2 font-mono text-xs break-all">
            {location.pathname}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {SUGGESTIONS.map((s) => (
              <Button key={s.to} asChild variant={s.to === "/" ? "default" : "outline"}>
                <Link to={s.to}>
                  {s.to === "/" && <Home className="mr-2 h-4 w-4" />}
                  {s.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
