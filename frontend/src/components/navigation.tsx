"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/jobs", label: "Jobs" },
  { href: "/assistant", label: "Assistant" },
  { href: "/tracker", label: "Tracker" },
  { href: "/productivity", label: "Productivity" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:sticky lg:top-0 lg:h-screen lg:px-6 lg:py-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-cyan-600 text-lg font-bold text-white">
            CP
          </span>
          <span>
            <span className="block text-base font-bold">CareerPilot</span>
            <span className="block text-xs text-slate-500">StackFellas</span>
          </span>
        </Link>

        <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname === "/" && item.href === "/dashboard");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
