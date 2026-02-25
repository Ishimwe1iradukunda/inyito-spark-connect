import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, ArrowLeft, Home, LogIn, LogOut, FolderOpen } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const routeLinks: { label: string; path: string }[] = [
    { label: "Studio", path: "/studio" },
    ...(user ? [{ label: "My Recordings", path: "/my-recordings" }] : []),
  ];

  const anchorLinks = ["About", "Features", "Generations", "Community"];

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/90 backdrop-blur-md border-b border-border shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Back Button */}
          <div className="flex items-center gap-3">
            {!isHome && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <Home size={14} />
              </motion.button>
            )}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="flex gap-0.5">
                {["i", "n", "y", "i", "t", "o"].map((letter, i) => {
                  const colors = [
                    "hsl(var(--brand-blue))",
                    "hsl(var(--brand-green))",
                    "hsl(var(--brand-gold))",
                    "hsl(var(--brand-purple))",
                    "hsl(var(--brand-orange))",
                    "hsl(var(--brand-red))",
                  ];
                  return (
                    <span key={i} className="text-2xl font-black tracking-tight" style={{ color: colors[i] }}>
                      {letter}
                    </span>
                  );
                })}
              </div>
              <span className="text-muted-foreground text-sm font-medium">.com</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {anchorLinks.map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                {link}
              </a>
            ))}
            {routeLinks.map(({ label, path }) => (
              <a key={path} href={path} onClick={(e) => handleNavClick(e, path)} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                {label}
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/my-recordings")}>
                  <FolderOpen size={14} />
                  Library
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut()}>
                  <LogOut size={14} />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button className="glow-blue font-semibold px-6 gap-2" size="sm" onClick={() => navigate("/auth")}>
                <LogIn size={14} />
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-foreground p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden pb-4 border-t border-border mt-1">
            {anchorLinks.map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="block py-3 text-muted-foreground hover:text-foreground transition-colors font-medium">
                {link}
              </a>
            ))}
            {routeLinks.map(({ label, path }) => (
              <a key={path} href={path} onClick={(e) => handleNavClick(e, path)} className="block py-3 text-muted-foreground hover:text-foreground transition-colors font-medium">
                {label}
              </a>
            ))}
            {user ? (
              <Button variant="ghost" className="w-full mt-3 gap-2" onClick={() => { signOut(); setMenuOpen(false); }}>
                <LogOut size={14} /> Sign Out
              </Button>
            ) : (
              <Button className="w-full mt-3 glow-blue font-semibold gap-2" onClick={() => { navigate("/auth"); setMenuOpen(false); }}>
                <LogIn size={14} /> Sign In
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default NavBar;
