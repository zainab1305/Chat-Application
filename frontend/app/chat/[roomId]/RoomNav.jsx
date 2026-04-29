"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RoomNav({ roomId }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/chat/${roomId}/chat`, label: "Chat" },
    { href: `/chat/${roomId}/tasks`, label: "Tasks" },
    { href: `/chat/${roomId}/resources`, label: "Resources" },
    { href: `/chat/${roomId}/members`, label: "Members" },
  ];

  return (
    <div className="px-6 border-t border-slate-100">
      <nav className="flex items-center gap-8" aria-label="Room navigation">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}