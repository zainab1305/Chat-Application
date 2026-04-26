const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:5000";
const SOCKET_SERVER_SECRET = process.env.SOCKET_SERVER_SECRET || "";

function buildHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  if (SOCKET_SERVER_SECRET) {
    headers["x-socket-server-secret"] = SOCKET_SERVER_SECRET;
  }

  return headers;
}

export async function fetchActiveRoomUserIds(roomId) {
  if (!roomId) return [];

  try {
    const response = await fetch(`${SOCKET_SERVER_URL}/presence/rooms/${roomId}/users`, {
      method: "GET",
      headers: buildHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data.userIds) ? data.userIds.map(String) : [];
  } catch {
    return [];
  }
}

export async function emitRealtimeNotifications(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return;
  }

  try {
    await fetch(`${SOCKET_SERVER_URL}/emit/notifications`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ notifications }),
      cache: "no-store",
    });
  } catch {
    // Notification persistence succeeds even if realtime fanout misses.
  }
}
