"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { socket } from "@/lib/socket";
import { useSession } from "next-auth/react";

/* ─────────────── Icons ─────────────── */
function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

function IconMembers() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
    </svg>
  );
}

function IconAnnouncement() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zm4.4-16L18.8 3c-.4.53-.8 1.07-1.2 1.6.96.71 2.21 1.65 3.2 2.4.4-.54.8-1.08 1.2-1.61l-1.6-1.38zM5 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h2v4h2V4H5v2zm10 0H9v12h6c1.66 0 3-1.34 3-3V9c0-1.66-1.34-3-3-3z" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}
/* ────────────────────────────────────── */

function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default function RightSidebar({
  roomId,
  roomCode,
  creatorName,
  createdAt,
  memberCount,
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const channelId = searchParams.get("channel") || "";

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [copied, setCopied] = useState(false);

  /* ── realtime presence via socket ── */
  useEffect(() => {
    if (!roomId || !session?.user) return;

    const onRoomUsers = (payload) => {
      if (payload?.roomId !== roomId) return;
      setOnlineUsers(payload.users || []);
    };

    socket.on("roomUsers", onRoomUsers);

    return () => {
      socket.off("roomUsers", onRoomUsers);
    };
  }, [roomId, session?.user]);

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(roomCode || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable
    }
  }

  function goToAnnouncements() {
    const base = pathname.split("?")[0];
    router.push(`${base}${channelId ? `?channel=${channelId}` : ""}`);
  }

  function goToPinned() {
    const base = pathname.split("?")[0];
    router.push(`${base}${channelId ? `?channel=${channelId}` : ""}`);
  }

  return (
    <aside className="rs-root" aria-label="Room information">
      {/* ── Active Now ── */}
      <section className="rs-section">
        <h3 className="rs-section-title">Active Now ({onlineUsers.length})</h3>
        <p className="rs-section-sub">Live member presence</p>

        <div className="rs-members-list">
          {onlineUsers.length === 0 ? (
            <p className="rs-empty">No one active right now</p>
          ) : (
            onlineUsers.map((user) => (
              <div
                key={`${user.id}-${user.email}`}
                className="rs-member-item"
              >
                <div className="rs-member-avatar" aria-hidden="true">
                  {String(user.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="rs-member-info">
                  <p className="rs-member-name">{user.name}</p>
                  <div className="rs-member-status">
                    <span className="rs-status-dot" aria-hidden="true" />
                    <span>Online</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="rs-divider" role="separator" />

      {/* ── Room Info ── */}
      <section className="rs-section">
        <h3 className="rs-section-title">Room Info</h3>

        <div className="rs-info-grid">
          {creatorName && (
            <div className="rs-info-row">
              <span className="rs-info-label">Created by</span>
              <div className="rs-info-val rs-creator">
                <div className="rs-creator-avatar" aria-hidden="true">
                  {String(creatorName).charAt(0).toUpperCase()}
                </div>
                <span className="rs-creator-name">{creatorName}</span>
              </div>
            </div>
          )}

          {createdAt && (
            <div className="rs-info-row">
              <span className="rs-info-label">Created on</span>
              <div className="rs-info-val rs-date">
                <IconCalendar />
                <span>{formatDate(createdAt)}</span>
              </div>
            </div>
          )}

          {memberCount != null && (
            <div className="rs-info-row">
              <span className="rs-info-label">Members</span>
              <div className="rs-info-val">
                <IconMembers />
                <span>{memberCount}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="rs-divider" role="separator" />

      {/* ── Invite Code ── */}
      {roomCode && (
        <section className="rs-section">
          <h3 className="rs-section-title">Invite Code</h3>
          <div className="rs-invite-wrap">
            <code className="rs-invite-code">{roomCode}</code>
            <button
              type="button"
              className="rs-invite-copy"
              onClick={copyInviteCode}
              aria-label={copied ? "Copied!" : "Copy invite code"}
              title={copied ? "Copied!" : "Copy invite code"}
            >
              {copied ? <IconCheck /> : <IconCopy />}
            </button>
          </div>
        </section>
      )}

      <div className="rs-divider" role="separator" />

      {/* ── Quick Links ── */}
      <section className="rs-section">
        <h3 className="rs-section-title">Quick Links</h3>

        <div className="rs-quick-links">
          <button
            type="button"
            className="rs-quick-link"
            onClick={goToAnnouncements}
            aria-label="View announcements"
          >
            <span className="rs-quick-icon rs-quick-icon--announce"><IconAnnouncement /></span>
            <span className="rs-quick-text">Announcements</span>
            <span className="rs-quick-arrow"><IconChevron /></span>
          </button>

          <button
            type="button"
            className="rs-quick-link"
            onClick={goToPinned}
            aria-label="View pinned messages"
          >
            <span className="rs-quick-icon rs-quick-icon--pin"><IconPin /></span>
            <span className="rs-quick-text">Pinned Messages</span>
            <span className="rs-quick-arrow"><IconChevron /></span>
          </button>
        </div>
      </section>
    </aside>
  );
}
