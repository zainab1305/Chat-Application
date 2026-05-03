"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useNotifications } from "@/providers/NotificationProvider";

/* ─────────────────────────── SVG icons ─────────────────────────── */
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}

function IconHash() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M10.5 3l-1 5H5.5l-.35 2h4l-1 5H4l-.35 2h4.1L7 20h2l.75-3h3.5L12.5 20h2l.75-3h3.25l.35-2h-3.25l1-5h3.25l.35-2h-3.25l1-5H16.5l-1 5h-3.5l1-5H10.5zm.25 7h3.5l-1 5h-3.5l1-5z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M11 5h2v14h-2zM5 11h14v2H5z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
      className="ls-spinner"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}
/* ─────────────────────────────────────────────────────────────────── */

export default function LeftSidebar({
  workspaceId,
  workspaceName,
  workspaceCode,
  isOwner,
  currentUserId,
  currentUserName,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notifications } = useNotifications();

  const activeChannelId = searchParams.get("channel") || "";

  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const inputRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ── fetch channels ── */
  async function fetchChannels() {
    setChannelsLoading(true);
    try {
      const res = await fetch(`/api/rooms/${workspaceId}/channels`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setChannels(data.channels || []);
        const first = data.channels?.[0];
        if (!activeChannelId && first) {
          router.replace(`${pathname}?channel=${first._id}`);
        }
      }
    } catch {
      // silently fail
    } finally {
      setChannelsLoading(false);
    }
  }

  useEffect(() => {
    if (workspaceId) fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  /* auto-focus modal input */
  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [modalOpen]);

  /* ── create channel ── */
  async function handleCreate(e) {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(`/api/rooms/${workspaceId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create channel");
      setNewChannelName("");
      setModalOpen(false);
      // Add to list and navigate to it
      setChannels((prev) => [...prev, data.channel]);
      router.push(`${pathname}?channel=${data.channel._id}`);
    } catch (err) {
      setCreateError(err.message || "Failed to create channel");
    } finally {
      setCreating(false);
    }
  }

  /* ── filtered channels for search ── */
  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ── navigate to channel ── */
  function selectChannel(channelId) {
    router.push(`${pathname}?channel=${channelId}`);
  }

  return (
    <>
      <aside className="ls-root" aria-label="Workspace navigation">
        {/* ── Workspace Header ── */}
        <div className="ls-workspace-header">
          <div className="ls-workspace-logo" aria-hidden="true">W</div>
          <div className="ls-workspace-info">
            <p className="ls-workspace-label">Workspace</p>
            <p className="ls-workspace-name" title={workspaceName}>{workspaceName}</p>
          </div>
        </div>

        {/* ── Main Nav ── */}
        <nav className="ls-nav" aria-label="Main navigation">
          <Link
            href="/dashboard"
            className={`ls-nav-item ${pathname === "/dashboard" ? "ls-nav-item--active" : ""}`}
          >
            <span className="ls-nav-icon"><IconHome /></span>
            <span>Home</span>
          </Link>

          <button
            type="button"
            className="ls-nav-item ls-nav-item--btn"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          >
            <span className="ls-nav-icon"><IconBell /></span>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ls-nav-badge" aria-label={`${unreadCount} unread`}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </nav>

        <div className="ls-divider" role="separator" />

        {/* ── Rooms / Channels Section ── */}
        <div className="ls-section">
          <div className="ls-section-header">
            <span className="ls-section-label">ROOMS</span>
            {isOwner && (
              <button
                type="button"
                className="ls-section-add"
                onClick={() => setModalOpen(true)}
                aria-label="Create new room"
                title="Create room"
              >
                <IconPlus />
              </button>
            )}
          </div>

          {/* Search */}
          <div className="ls-search-wrap">
            <span className="ls-search-icon" aria-hidden="true"><IconSearch /></span>
            <input
              type="text"
              className="ls-search"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search channels"
            />
          </div>

          {/* Channel list */}
          <div className="ls-channel-list" role="list">
            {channelsLoading ? (
              <div className="ls-channels-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="ls-channel-skeleton" aria-hidden="true" />
                ))}
              </div>
            ) : filteredChannels.length === 0 ? (
              <p className="ls-channels-empty">No rooms found</p>
            ) : (
              filteredChannels.map((ch) => {
                const isActive = ch._id === activeChannelId;
                return (
                  <button
                    key={ch._id}
                    type="button"
                    role="listitem"
                    className={`ls-channel-item ${isActive ? "ls-channel-item--active" : ""}`}
                    onClick={() => selectChannel(ch._id)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="ls-channel-hash" aria-hidden="true"><IconHash /></span>
                    <span className="ls-channel-name">{ch.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="ls-divider" role="separator" />

        {/* ── Footer Actions ── */}
        <div className="ls-footer">
          {isOwner && (
            <button
              type="button"
              className="ls-footer-btn ls-footer-btn--primary"
              onClick={() => setModalOpen(true)}
            >
              <IconPlus />
              Create Room
            </button>
          )}
        </div>

        {/* ── User bar ── */}
        {currentUserName && (
          <div className="ls-user-bar">
            <div className="ls-user-avatar" aria-hidden="true">
              {String(currentUserName).charAt(0).toUpperCase()}
            </div>
            <div className="ls-user-info">
              <p className="ls-user-name">{currentUserName}</p>
              <div className="ls-user-status">
                <span className="ls-status-dot" aria-hidden="true" />
                <span>Online</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Create Channel Modal ── */}
      {modalOpen && (
        <div
          className="ls-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-channel-title"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="ls-modal">
            <div className="ls-modal-header">
              <h2 id="create-channel-title" className="ls-modal-title">Create Room</h2>
              <button
                type="button"
                className="ls-modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="ls-modal-desc">
              Rooms are channels where conversations happen. Give it a short, clear name.
            </p>

            <form onSubmit={handleCreate} className="ls-modal-form">
              {createError && (
                <p className="ls-modal-error" role="alert">{createError}</p>
              )}
              <div className="ls-modal-field">
                <label htmlFor="ls-channel-name" className="ls-modal-label">Room Name</label>
                <div className="ls-modal-input-wrap">
                  <span className="ls-modal-hash" aria-hidden="true">#</span>
                  <input
                    id="ls-channel-name"
                    ref={inputRef}
                    type="text"
                    className="ls-modal-input"
                    placeholder="e.g. design-team"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    maxLength={40}
                    required
                    autoComplete="off"
                  />
                </div>
                <p className="ls-modal-hint">
                  Lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              <div className="ls-modal-actions">
                <button
                  type="button"
                  className="ls-modal-btn ls-modal-btn--cancel"
                  onClick={() => { setModalOpen(false); setNewChannelName(""); setCreateError(""); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ls-modal-btn ls-modal-btn--submit"
                  disabled={creating || !newChannelName.trim()}
                >
                  {creating ? <><IconSpinner /> Creating…</> : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
