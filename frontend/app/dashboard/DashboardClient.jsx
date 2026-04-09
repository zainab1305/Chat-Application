"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardClient() {
  const { data: session } = useSession();
  const router = useRouter();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createRoomName, setCreateRoomName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const greetingName = useMemo(() => {
    if (!session?.user?.name) return session?.user?.email || "there";
    return session.user.name;
  }, [session]);

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

  useEffect(() => {
    fetchRooms();
  }, []);

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
      await fetchRooms();
      router.push(`/chat/${data.room._id}`);
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
      await fetchRooms();
      router.push(`/chat/${data.room._id}`);
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

          <button className="ghost-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
            Logout
          </button>
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
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-char code"
                maxLength={6}
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
                  className="room-item"
                  onClick={() => router.push(`/chat/${room._id}`)}
                >
                  <div>
                    <h3>{room.name}</h3>
                    <p>Code: {room.code}</p>
                  </div>
                  <span>Open</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
