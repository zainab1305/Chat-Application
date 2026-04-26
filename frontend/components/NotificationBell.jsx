"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/providers/NotificationProvider";

const ACTION_LABELS = {
  message: "Message",
  file: "File",
  task: "Task",
  announcement: "Announcement",
};

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 3.25a4.75 4.75 0 0 0-4.75 4.75v2.03c0 .84-.24 1.66-.69 2.37L5.1 14.7a1.75 1.75 0 0 0 1.48 2.68h10.84a1.75 1.75 0 0 0 1.48-2.68l-1.46-2.3a4.4 4.4 0 0 1-.69-2.37V8A4.75 4.75 0 0 0 12 3.25Zm0 17.5a2.74 2.74 0 0 1-2.56-1.75h5.12A2.74 2.74 0 0 1 12 20.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function NotificationBell({ className = "" }) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    markAsRead,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const notificationItems = useMemo(() => notifications.slice(0, 20), [notifications]);

  async function handleNotificationClick(notification) {
    setBusy(true);

    try {
      if (!notification.isRead) {
        await markAsRead(notification._id);
      }
    } finally {
      setBusy(false);
      setOpen(false);
      router.push(notification.link || `/chat/${notification.roomId}`);
    }
  }

  async function handleMarkAllAsRead() {
    setBusy(true);

    try {
      await markAllAsRead();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`dashboard-bell-wrap ${className}`.trim()} ref={wrapperRef}>
      <button
        type="button"
        className="ghost-btn dashboard-bell-btn"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open notifications"
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="dashboard-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className="dashboard-notification-popover">
          <div className="dashboard-notification-head">
            <div>
              <h3>Notifications</h3>
              <p>{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
            </div>
            <button
              type="button"
              className="ghost-btn dashboard-notification-markall"
              onClick={handleMarkAllAsRead}
              disabled={busy || unreadCount === 0}
            >
              Mark all read
            </button>
          </div>

          {loading && notificationItems.length === 0 ? (
            <p className="dashboard-notification-empty">Loading notifications...</p>
          ) : notificationItems.length === 0 ? (
            <p className="dashboard-notification-empty">No notifications yet.</p>
          ) : (
            <div className="dashboard-notification-list">
              {notificationItems.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  className={`dashboard-notification-item ${item.isRead ? "" : "unread"}`.trim()}
                  onClick={() => handleNotificationClick(item)}
                  disabled={busy}
                >
                  <div className="dashboard-notification-item-top">
                    <strong>{item.senderName}</strong>
                    <span className="dashboard-notification-time">{formatTime(item.createdAt)}</span>
                  </div>
                  <p className="dashboard-notification-meta">
                    {ACTION_LABELS[item.actionType] || item.actionType} in {item.roomName}
                  </p>
                  <p>{item.previewText}</p>
                  <span className={`dashboard-notification-status ${item.isRead ? "read" : "unread"}`}>
                    {item.isRead ? "Read" : "Unread"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
