import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

const LETTERS = ["i", "n", "y", "i", "t", "o"];
const COLORS = [
  "hsl(var(--brand-blue))",
  "hsl(var(--brand-green))",
  "hsl(var(--brand-gold))",
  "hsl(var(--brand-purple))",
  "hsl(var(--brand-orange))",
  "hsl(var(--brand-red))",
];

const SOCIAL_LINKS = [
  { label: "Twitter", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Facebook", href: "#" },
];

const FOOTER_LINKS = [
  { label: "About", href: "/#about" },
  { label: "Features", href: "/#features" },
  { label: "Community", href: "/#community" },
  { label: "Studio", href: "/studio" },
  { label: "Templates", href: "/templates" },
  { label: "Pay Now", href: "/checkout" },
];

const SiteFooter = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      if (pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    navigate(href);
  };

  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {LETTERS.map((letter, i) => (
                <span key={i} className="text-xl font-black" style={{ color: COLORS[i] }}>
                  {letter}
                </span>
              ))}
            </div>
            <span className="text-muted-foreground text-sm">.com</span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleClick(e, link.href)}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Social */}
          <div className="flex gap-4">
            {SOCIAL_LINKS.map((link, i) => (
              <motion.a
                key={link.label}
                href={link.href}
                onClick={(e) => handleClick(e, link.href)}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                whileHover={{ scale: 1.1 }}
                style={{ color: i === 0 ? undefined : undefined }}
              >
                {link.label}
              </motion.a>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-muted-foreground text-xs tracking-widest uppercase mb-2">
            The Future is Together
          </p>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} inyito.com — All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
