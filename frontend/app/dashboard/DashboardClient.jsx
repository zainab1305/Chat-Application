"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";

export default function DashboardClient() {
  const ROOM_CODE_LENGTH = 6;
  const { data: session } = useSession();
  const router = useRouter();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createRoomName, setCreateRoomName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [unreadByRoom, setUnreadByRoom] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationUnread, setNotificationUnread] = useState(0);

  const greetingName = useMemo(() => {
    if (!session?.user?.name) return session?.user?.email || "there";
    return session.user.name;
  }, [session]);

  const currentUserToken = useMemo(
    () => String(session?.user?.id || session?.user?.email || ""),
    [session?.user?.id, session?.user?.email]
  );

  const roomNameById = useMemo(() => {
    const next = {};
    for (const room of rooms) {
      next[room._id] = room.name;
    }
    return next;
  }, [rooms]);

  function addDashboardNotification(item) {
    setNotificationItems((current) => [item, ...current].slice(0, 40));
    setNotificationUnread((current) => current + 1);
  }

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

  async function openRoom(roomId) {
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
    router.push(`/chat/${roomId}`);
  }

  useEffect(() => {
    Promise.all([fetchRooms(), fetchUnread()]);
  }, []);

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

        const nextCount = (current[payload.roomId] || 0) + 1;
        return { ...current, [payload.roomId]: nextCount };
      });

      if (rooms.some((room) => room._id === payload.roomId)) {
        setTotalUnread((current) => current + 1);
      }
    };

    const onDashboardNotification = (payload) => {
      if (!payload?.type || !payload?.roomId) return;

      const roomName = roomNameById[payload.roomId] || "a room";
      const isKnownRoom = Boolean(roomNameById[payload.roomId]);

      if (!isKnownRoom && String(payload?.targetUserId || "") !== currentUserToken) {
        return;
      }

      if (payload.type === "reply") {
        if (String(payload.targetUserId || "") !== currentUserToken) return;

        addDashboardNotification({
          id: `${payload.type}-${payload.messageId || Date.now()}`,
          type: payload.type,
          roomId: payload.roomId,
          title: `${payload.actorName || "Someone"} replied to you`,
          description: payload.preview || "Open room to view reply",
          createdAt: payload.createdAt || new Date().toISOString(),
        });
        return;
      }

      if (payload.type === "announcement") {
        if (!isKnownRoom) return;

        addDashboardNotification({
          id: `${payload.type}-${payload.messageId || Date.now()}`,
          type: payload.type,
          roomId: payload.roomId,
          title: `Announcement in ${roomName}`,
          description: payload.preview || "Open room to read",
          createdAt: payload.createdAt || new Date().toISOString(),
        });
        return;
      }

      if (payload.type === "member-joined") {
        if (!isKnownRoom) return;

        addDashboardNotification({
          id: `${payload.type}-${payload.actorUserId || Date.now()}`,
          type: payload.type,
          roomId: payload.roomId,
          title: `${payload.actorName || "A member"} joined ${roomName}`,
          description: "New member joined the room",
          createdAt: payload.createdAt || new Date().toISOString(),
        });
        return;
      }

      if (payload.type === "member-removed") {
        const isSelfTarget = String(payload?.targetUserId || "") === currentUserToken;
        if (!isKnownRoom && !isSelfTarget) return;

        addDashboardNotification({
          id: `${payload.type}-${payload.targetUserId || Date.now()}`,
          type: payload.type,
          roomId: payload.roomId,
          title: isSelfTarget
            ? `You were removed from ${roomName}`
            : `A member was removed from ${roomName}`,
          description: `${payload.actorName || "Manager"} updated room members`,
          createdAt: payload.createdAt || new Date().toISOString(),
        });
      }
    };

    socket.on("newMessageNotification", onNewMessageNotification);
    socket.on("dashboardNotification", onDashboardNotification);

    return () => {
      socket.off("newMessageNotification", onNewMessageNotification);
      socket.off("dashboardNotification", onDashboardNotification);
    };
  }, [rooms, roomNameById, session?.user, currentUserToken]);

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
      openRoom(data.room._id);
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

      if (socket.connected) {
        socket.emit("memberJoinedNotification", {
          roomId: data.room._id,
          userId: currentUserToken,
          userName: session?.user?.name || session?.user?.email || "A member",
        });
      }

      openRoom(data.room._id);
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
          <div>
            <p className="dashboard-kicker">Workspace</p>
            <h1>Welcome, {greetingName}</h1>
            <p>Pick a room, create one, or join with a room code.</p>
          </div>

          <div className="dashboard-head-actions">
            <div className="dashboard-bell-wrap">
              <button
                className="ghost-btn dashboard-bell-btn"
                onClick={() => {
                  setNotificationOpen((open) => {
                    const next = !open;
                    if (next) {
                      setNotificationUnread(0);
                    }
                    return next;
                  });
                }}
                aria-label="Open notifications"
              >
                <span aria-hidden="true">🔔</span>
                {notificationUnread > 0 && (
                  <span className="dashboard-bell-badge">{notificationUnread}</span>
                )}
              </button>

              {notificationOpen && (
                <div className="dashboard-notification-popover">
                  <div className="dashboard-notification-head">
                    <h3>Notifications</h3>
                  </div>

                  {notificationItems.length === 0 ? (
                    <p className="dashboard-notification-empty">No notifications yet.</p>
                  ) : (
                    <div className="dashboard-notification-list">
                      {notificationItems.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className="dashboard-notification-item"
                          onClick={() => {
                            setNotificationOpen(false);
                            openRoom(item.roomId);
                          }}
                        >
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button className="ghost-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
              Logout
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <section className="dashboard-grid">
          <article className="card">
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

          <article className="card">
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

        <section className="room-list card">
          <div className="room-list-head">
            <h2>Your Rooms</h2>
            <button className="ghost-btn" onClick={fetchRooms}>
              Refresh
            </button>
          </div>

          {loading ? (
            <p>Loading rooms...</p>
          ) : rooms.length === 0 ? (
            <p>No rooms yet. Create one or join with a code.</p>
          ) : (
            <div className="rooms">
              {rooms.map((room) => (
                <button
                  key={room._id}
                  className={`room-item ${(unreadByRoom[room._id] || 0) > 0 ? "room-item-unread" : ""}`}
                  onClick={() => openRoom(room._id)}
                >
                  <div>
                    <h3>{room.name}</h3>
                    <p>Code: {room.code}</p>
                  </div>
                  <div className="room-item-side">
                    {(unreadByRoom[room._id] || 0) > 0 && (
                      <span className="room-unread-badge">{unreadByRoom[room._id]}</span>
                    )}
                    <span>Open</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
