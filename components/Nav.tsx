"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/today", label: "Today" },
  { href: "/closet", label: "Closet" },
  { href: "/outfits", label: "Outfits" },
  { href: "/try", label: "Try" },
  { href: "/gaps", label: "Gaps" },
  { href: "/style", label: "Style" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-stone-950/90 backdrop-blur-sm border-b border-stone-100 dark:border-stone-800">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/today" className="font-medium text-stone-900 dark:text-stone-100 tracking-tight">
          lookbook
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
