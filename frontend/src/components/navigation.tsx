"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "./theme-provider";

const navLinks = [
  { name: "Home", href: "/", isRoute: true },
  { name: "Dashboard", href: "/dashboard", isRoute: true },
  { name: "Upload", href: "/upload", isRoute: true },
  { name: "Jobs", href: "/jobs", isRoute: true },
  { name: "Assistant", href: "/assistant", isRoute: true },
  { name: "Cover Letter", href: "/cover-letter", isRoute: true },
  { name: "Tracker", href: "/tracker", isRoute: true },
  { name: "Productivity", href: "/productivity", isRoute: true },
];

export function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
      setIsScrolled(window.scrollY > 20);

      const sections = navLinks.filter(l => !l.isRoute).map((link) => link.href.slice(1));
      const current = sections.find((section) => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      if (current) setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string, isRoute?: boolean) => {
    setIsMobileOpen(false);
    if (isRoute) return;
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <motion.div
        className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-[#1D4ED8]"
        style={{ scaleX: scrollProgress / 100 }}
        transition={{ duration: 0.1, ease: "linear" }}
      />

      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[var(--nav-surface)] shadow-[0_1px_0_var(--nav-shadow)]"
            : "bg-transparent"
        }`}
      >
        <nav
          className={`mx-auto flex h-16 max-w-7xl items-center justify-between px-6 backdrop-blur-xl transition-all duration-500 ${
            isScrolled ? "border-b border-[var(--nav-border)]" : ""
          }`}
        >
          <Link
            href="#"
            className="text-xl font-extrabold tracking-tight text-[var(--foreground)]"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            CareerPilot
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <li key={link.name}>
                {link.isRoute ? (
                  <Link
                    href={link.href}
                    className={`group relative px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                      pathname === link.href
                        ? "text-[#1D4ED8]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {link.name}
                    <motion.span
                      className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#1D4ED8]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: pathname === link.href ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </Link>
                ) : (
                  <button
                    onClick={() => handleNavClick(link.href)}
                    className={`group relative px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                      activeSection === link.href.slice(1)
                        ? "text-[#1D4ED8]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {link.name}
                    <motion.span
                      className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#1D4ED8]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: activeSection === link.href.slice(1) ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--nav-border)] bg-[var(--card-surface)] text-[var(--foreground)] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--hover-surface)]"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              href="/upload"
              className="rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-[#1E40AF] hover:shadow-md"
            >
              Upload CV
            </Link>
          </div>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="rounded-lg p-2 text-[var(--foreground)] transition-colors hover:bg-[var(--hover-surface)] md:hidden"
          >
            {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        <motion.div
          initial={false}
          animate={{
            height: isMobileOpen ? "auto" : 0,
            opacity: isMobileOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden border-b border-[var(--nav-border)] bg-[var(--nav-mobile-surface)] backdrop-blur-xl md:hidden"
        >
          <ul className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <li key={link.name}>
                {link.isRoute ? (
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`block w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      pathname === link.href
                        ? "bg-[var(--accent-soft)] text-[#1D4ED8]"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--hover-surface)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {link.name}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleNavClick(link.href)}
                    className={`w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      activeSection === link.href.slice(1)
                        ? "bg-[var(--accent-soft)] text-[#1D4ED8]"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--hover-surface)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {link.name}
                  </button>
                )}
              </li>
            ))}
            <li className="mt-2">
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setIsMobileOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--nav-border)] bg-[var(--card-surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
            </li>
            <li className="mt-2">
              <Link
                href="/upload"
                className="block w-full rounded-lg bg-[#1D4ED8] px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Upload CV
              </Link>
            </li>
          </ul>
        </motion.div>
      </motion.header>

      <div className="h-16" />
    </>
  );
}
