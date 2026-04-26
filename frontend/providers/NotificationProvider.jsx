"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { socket } from "@/lib/socket";

const NotificationContext = createContext(null);

function upsertNotificationItem(items, incoming) {
  const next = [incoming, ...items.filter((item) => item._id !== incoming._id)];
  return next.slice(0, 50);
}

export function NotificationProvider({ children }) {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);

      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load notifications");
        }

        if (!cancelled) {
          setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
          setUnreadCount(data.unreadCount || 0);
          hasLoadedRef.current = true;
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("registerUser", { userId: session.user.id });

    const onNotificationCreated = (notification) => {
      if (!notification?._id || String(notification.recipientId || "") !== String(session.user.id)) {
        return;
      }

      setNotifications((current) => upsertNotificationItem(current, notification));
      setUnreadCount((current) => current + (notification.isRead ? 0 : 1));
    };

    socket.on("notificationCreated", onNotificationCreated);

    return () => {
      socket.off("notificationCreated", onNotificationCreated);
    };
  }, [session?.user?.id, status]);

  async function refreshNotifications() {
    if (status !== "authenticated" || !session?.user?.id) return;

    const response = await fetch("/api/notifications", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load notifications");
    }

    setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    setUnreadCount(data.unreadCount || 0);
  }

  async function markAsRead(notificationId) {
    if (!notificationId) return null;

    const target = notifications.find((item) => item._id === notificationId);
    if (target?.isRead) {
      return target;
    }

    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to mark notification as read");
    }

    setNotifications((current) =>
      current.map((item) =>
        item._id === notificationId
          ? { ...item, isRead: true, readAt: data.notification.readAt }
          : item
      )
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    return data.notification;
  }

  async function markAllAsRead() {
    const hasUnread = notifications.some((item) => !item.isRead);
    if (!hasUnread) return;

    const response = await fetch("/api/notifications/read-all", {
      method: "PATCH",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to mark all notifications as read");
    }

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt || data.readAt,
      }))
    );
    setUnreadCount(0);
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        hasLoaded: hasLoadedRef.current,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);

  if (!value) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }

  return value;
}
