"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import { socket } from "@/lib/socket";

export default function DashboardClient() {
  const ROOM_CODE_LENGTH = 6;
  const { data: session } = useSession();
  const router = useRouter();
  const [toast, setToast] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createRoomName, setCreateRoomName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [unreadByRoom, setUnreadByRoom] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [roomInsights, setRoomInsights] = useState({});
  const [insightsLoading, setInsightsLoading] = useState(false);

  function showToast(message, type = "success") {
    setToast({ message, type });
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), 2400);
  }

  const greetingName = useMemo(() => {
    if (!session?.user?.name) return session?.user?.email || "there";
    return session.user.name;
  }, [session]);

  const recentRooms = useMemo(() => rooms.slice(0, 4), [rooms]);

  const stats = useMemo(() => {
    const roomsJoined = rooms.length;
    const tasksPending = rooms.reduce(
      (total, room) => total + (roomInsights[room._id]?.pendingTasks || 0),
      0
    );
    const filesShared = rooms.reduce(
      (total, room) => total + (roomInsights[room._id]?.filesShared || 0),
      0
    );

    return {
      roomsJoined,
      tasksPending,
      filesShared,
    };
  }, [rooms, roomInsights]);

  async function fetchRooms() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch rooms");
      }

      setRooms(data.rooms || []);
    } catch (err) {
      setError(err.message || "Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnread() {
    try {
      const response = await fetch("/api/room/unread", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch unread counts");
      }

      const nextUnread = (data.unread || []).reduce((acc, item) => {
        acc[item.roomId] = item.unreadCount || 0;
        return acc;
      }, {});

      setUnreadByRoom(nextUnread);
      setTotalUnread(data.totalUnread || 0);
    } catch (err) {
      setError(err.message || "Failed to fetch unread counts");
    }
  }

  async function fetchRoomInsights(targetRooms) {
    if (!targetRooms.length) {
      setRoomInsights({});
      return;
    }

    setInsightsLoading(true);

    try {
      const entries = await Promise.all(
        targetRooms.map(async (room) => {
          try {
            const [messagesRes, tasksRes, resourcesRes] = await Promise.all([
              fetch(`/api/rooms/${room._id}/messages`, { cache: "no-store" }),
              fetch(`/api/rooms/${room._id}/tasks`, { cache: "no-store" }),
              fetch(`/api/rooms/${room._id}/resources`, { cache: "no-store" }),
            ]);

            const [messagesData, tasksData, resourcesData] = await Promise.all([
              messagesRes.json(),
              tasksRes.json(),
              resourcesRes.json(),
            ]);

            const messages = Array.isArray(messagesData?.messages) ? messagesData.messages : [];
            const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];
            const resources = Array.isArray(resourcesData?.resources) ? resourcesData.resources : [];

            const previewMessage =
              messages.length > 0
                ? String(messages[messages.length - 1]?.message || "No messages yet")
                : "No messages yet";

            return [
              room._id,
              {
                previewMessage,
                pendingTasks: tasks.filter((task) => task.status !== "done").length,
                filesShared: resources.length,
              },
            ];
          } catch {
            return [
              room._id,
              {
                previewMessage: "No messages yet",
                pendingTasks: 0,
                filesShared: 0,
              },
            ];
          }
        })
      );

      setRoomInsights(Object.fromEntries(entries));
    } finally {
      setInsightsLoading(false);
    }
  }

  async function openRoom(roomId, options = {}) {
    try {
      await fetch("/api/room/last-seen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
    } catch {
      // The room view will retry and sync lastSeen again on load.
    }

    setUnreadByRoom((current) => {
      const deduction = current[roomId] || 0;
      setTotalUnread((total) => Math.max(0, total - deduction));
      return { ...current, [roomId]: 0 };
    });

    if (options.toastMessage) {
      showToast(options.toastMessage, options.toastType || "success");
      window.setTimeout(() => {
        router.push(`/chat/${roomId}`);
      }, 300);
      return;
    }

    router.push(`/chat/${roomId}`);
  }

  useEffect(() => {
    Promise.all([fetchRooms(), fetchUnread()]);
  }, []);

  useEffect(() => {
    fetchRoomInsights(rooms);
  }, [rooms]);

  useEffect(() => {
    if (!session?.user) return;

    if (!socket.connected) {
      socket.connect();
    }

    const onNewMessageNotification = (payload) => {
      if (!payload?.roomId) return;

      setUnreadByRoom((current) => {
        if (!(payload.roomId in current) && !rooms.some((room) => room._id === payload.roomId)) {
          return current;
        }

        return { ...current, [payload.roomId]: (current[payload.roomId] || 0) + 1 };
      });

      if (rooms.some((room) => room._id === payload.roomId)) {
        setTotalUnread((current) => current + 1);
      }
    };

    socket.on("newMessageNotification", onNewMessageNotification);

    return () => {
      socket.off("newMessageNotification", onNewMessageNotification);
    };
  }, [rooms, session?.user]);

  async function handleCreateRoom(e) {
    e.preventDefault();
    setActionLoading(true);
    setError("");

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createRoomName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create room");
      }

      setCreateRoomName("");
      await Promise.all([fetchRooms(), fetchUnread()]);
      openRoom(data.room._id, { toastMessage: "Room created successfully" });
    } catch (err) {
      setError(err.message || "Failed to create room");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleJoinRoom(e) {
    e.preventDefault();
    setActionLoading(true);
    setError("");

    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinRoomCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join room");
      }

      setJoinRoomCode("");
      await Promise.all([fetchRooms(), fetchUnread()]);
      openRoom(data.room._id, { toastMessage: "Joined room successfully" });
    } catch (err) {
      setError(err.message || "Failed to join room");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div className="dashboard-hero-copy">
            <p className="dashboard-kicker">Workspace</p>
            <h1>Welcome, {greetingName}</h1>
            <p className="dashboard-hero-text">Pick a room, drop updates, and keep your team in flow.</p>
            {totalUnread > 0 ? (
              <p className="dashboard-unread-indicator">{totalUnread} unread updates across rooms</p>
            ) : null}
          </div>

          <div className="dashboard-head-actions">
            <NotificationBell />

            <button className="ghost-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
              Logout
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <section className="dashboard-grid dashboard-quick-actions">
          <article className="card action-card action-card-primary">
            <h2>Create Room</h2>
            <p>Start a fresh collaboration space for your team.</p>

            <form onSubmit={handleCreateRoom} className="form-stack">
              <input
                type="text"
                value={createRoomName}
                onChange={(e) => setCreateRoomName(e.target.value)}
                placeholder="e.g. Product Sprint"
                maxLength={50}
                required
              />

              <button disabled={actionLoading} type="submit" className="primary-btn">
                {actionLoading ? "Please wait..." : "Create Room"}
              </button>
            </form>
          </article>

          <article className="card action-card action-card-secondary">
            <h2>Join Room</h2>
            <p>Already have a room code? Enter it and jump in.</p>

            <form onSubmit={handleJoinRoom} className="form-stack">
              <input
                type="text"
                value={joinRoomCode}
                onChange={(e) => {
                  const sanitized = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, ROOM_CODE_LENGTH);

                  setJoinRoomCode(sanitized);
                }}
                placeholder="Enter 6-char code"
                minLength={ROOM_CODE_LENGTH}
                maxLength={ROOM_CODE_LENGTH}
                pattern="[A-Z0-9]{6}"
                title="Room code must be exactly 6 letters or numbers"
                autoComplete="off"
                required
              />

              <button disabled={actionLoading} type="submit" className="secondary-btn">
                {actionLoading ? "Please wait..." : "Join Room"}
              </button>
            </form>
          </article>
        </section>

        <section className="dashboard-stats">
          <article className="dashboard-stat-card">
            <p>Rooms joined</p>
            <strong>{stats.roomsJoined}</strong>
          </article>

          <article className="dashboard-stat-card">
            <p>Tasks pending</p>
            <strong>{stats.tasksPending}</strong>
          </article>

          <article className="dashboard-stat-card">
            <p>Files shared</p>
            <strong>{stats.filesShared}</strong>
          </article>
        </section>

        <section className="room-list card recent-rooms-panel">
          <div className="room-list-head">
            <h2>Recent Rooms</h2>
            <button className="ghost-btn" onClick={fetchRooms}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="room-skeleton-grid" aria-label="Loading rooms">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="room-skeleton-card">
                  <div className="skeleton-line skeleton-line-title" />
                  <div className="skeleton-line skeleton-line-code" />
                  <div className="skeleton-line skeleton-line-text" />
                  <div className="skeleton-line skeleton-line-button" />
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <p>No rooms yet. Create one or join with a code.</p>
          ) : (
            <div className="recent-rooms-grid">
              {recentRooms.map((room) => {
                const unread = unreadByRoom[room._id] || 0;
                const insight = roomInsights[room._id];

                return (
                  <article key={room._id} className="recent-room-card">
                    <div className="recent-room-head">
                      <h3>{room.name}</h3>
                      {unread > 0 ? <span className="room-unread-badge">{unread}</span> : null}
                    </div>

                    <p className="recent-room-code">Code: {room.code}</p>
                    <p className="recent-room-preview">
                      {insightsLoading
                        ? "Loading latest message..."
                        : insight?.previewMessage || "No messages yet"}
                    </p>

                    <button className="primary-btn recent-room-open" onClick={() => openRoom(room._id)}>
                      Open
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {toast ? (
          <div className={`app-toast ${toast.type === "error" ? "app-toast-error" : "app-toast-success"}`} role="status">
            {toast.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
