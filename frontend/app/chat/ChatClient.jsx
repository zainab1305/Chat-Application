"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ChatClient({ roomId }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [room, setRoom] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setLoadError("");

      try {
        const roomRes = await fetch("/api/rooms", { cache: "no-store" });
        const roomData = await roomRes.json();

        if (!roomRes.ok) {
          throw new Error(roomData.error || "Failed to fetch room details");
        }

        const currentRoom = (roomData.rooms || []).find((r) => r._id === roomId);

        if (!currentRoom) {
          throw new Error("Room not found or you are not a member");
        }

        const messagesRes = await fetch(`/api/rooms/${roomId}/messages`, {
          cache: "no-store",
        });
        const messagesData = await messagesRes.json();

        if (!messagesRes.ok) {
          throw new Error(messagesData.error || "Failed to fetch messages");
        }

        if (isMounted) {
          setRoom(currentRoom);
          setMessages(messagesData.messages || []);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(err.message || "Unable to load room");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("joinRoom", { roomId });

    const onReceiveMessage = (data) => {
      if (data?.roomId !== roomId) return;

      setMessages((prev) => {
        const exists = prev.some((item) => item._id === data._id && data._id);
        if (exists) return prev;
        return [...prev, data];
      });
    };

    socket.on("receiveMessage", onReceiveMessage);

    return () => {
      socket.emit("leaveRoom", { roomId });
      socket.off("receiveMessage", onReceiveMessage);
    };
  }, [roomId]);

  const sendMessage = async () => {
    if (!session) return;

    if (!message.trim()) return;

    setSendError("");

    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      socket.emit("sendMessage", {
        _id: data.message._id,
        roomId,
        senderName: data.message.senderName,
        message: data.message.message,
        time: data.message.time,
      });

      setMessages((prev) => [...prev, data.message]);
      setMessage("");
    } catch (err) {
      setSendError(err.message || "Failed to send message");
    }
  };

  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-shell">
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="chat-page">
        <div className="chat-shell">
          <p className="error-banner">{loadError}</p>
          <button className="ghost-btn" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="chat-page">
      <div className="chat-shell">
        <div className="chat-header">
          <div>
            <p className="dashboard-kicker">Room</p>
            <h1>{room?.name}</h1>
            <p>Code: {room?.code}</p>
          </div>

          <div className="chat-header-actions">
            <button className="ghost-btn" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
            <button className="ghost-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
              Logout
            </button>
          </div>
        </div>

        {sendError && <p className="error-banner">{sendError}</p>}

        <div className="message-board">
          {messages.length === 0 ? (
            <p className="message-empty">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderName === (session?.user?.name || session?.user?.email);

              return (
                <div key={`${msg._id || i}-${msg.time}`} className={`message-item ${isMe ? "mine" : ""}`}>
                  <div className="message-meta">
                    <span>{msg.senderName}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p>{msg.message}</p>
                </div>
              );
            })
          )}
        </div>

        <div className="composer">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
          />

          <button className="primary-btn" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}