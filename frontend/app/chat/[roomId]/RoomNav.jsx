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
    <div className="room-tabs-wrap">
      <nav className="room-tabs" aria-label="Room navigation">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`room-tab ${isActive ? "active" : ""}`}
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