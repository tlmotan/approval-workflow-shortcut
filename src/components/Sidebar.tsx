"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DocumentIcon, ClockIcon, PlusCircleIcon } from "./icons";

const navItems = [
  { href: "/", label: "My Claims", icon: DocumentIcon, match: (p: string, s: string) => p === "/" && s !== "pending" },
  {
    href: "/?status=pending",
    label: "Pending Approvals",
    icon: ClockIcon,
    match: (p: string, s: string) => p === "/" && s === "pending",
  },
  { href: "/?submit=1", label: "Submit Claim", icon: PlusCircleIcon, match: () => false },
];

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active = item.match(pathname, status);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600/90 text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-slate-900 py-5">
      <div className="mb-6 flex items-center gap-2 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <DocumentIcon className="h-5 w-5" />
        </span>
        <span className="text-base font-semibold text-white">ExpenseFlow</span>
      </div>

      <Suspense fallback={<div className="px-3" />}>
        <SidebarNav />
      </Suspense>

      <div className="mt-auto border-t border-white/10 px-5 pt-4">
        <p className="text-xs text-slate-500">Expense Claim Approval Workflow</p>
      </div>
    </aside>
  );
}
