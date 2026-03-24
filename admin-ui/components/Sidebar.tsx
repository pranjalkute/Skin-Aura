"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ScanLine, Clock, Package } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan Product", icon: ScanLine },
  { href: "/pending", label: "Pending Review", icon: Clock },
  { href: "/products", label: "Products", icon: Package },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-xs font-bold">SA</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-1 leading-none">Skin Aura</p>
            <p className="text-[11px] text-text-3 mt-0.5">Admin Pipeline</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-100",
                active
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-text-2 hover:bg-surface-2 hover:text-text-1"
              )}
            >
              <Icon size={16} className={active ? "text-accent" : "text-text-3"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-[11px] text-text-3">Ingestion Pipeline v1.0</p>
      </div>
    </aside>
  );
}
