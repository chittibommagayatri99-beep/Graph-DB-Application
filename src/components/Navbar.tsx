"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Users, GitFork, Search } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { SearchModal } from "./SearchModal";

const NAV_LINKS = [
  { href: "/", label: "Movies", icon: Film },
  { href: "/people", label: "People", icon: Users },
  { href: "/connect", label: "Connect", icon: GitFork },
];

export function Navbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
              <span className="text-brand-400">◈</span>
              <span className="hidden sm:inline">CineGraph</span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-900/60 text-brand-300"
                        : "text-gray-400 hover:text-white hover:bg-surface-elevated"
                    )}
                  >
                    <Icon size={15} />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border
                         text-gray-400 text-sm hover:border-brand-600 hover:text-white transition-colors"
              aria-label="Open search"
            >
              <Search size={14} />
              <span className="hidden md:inline text-xs">Search…</span>
              <kbd className="hidden md:inline text-xs bg-surface px-1.5 py-0.5 rounded border border-surface-border">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
