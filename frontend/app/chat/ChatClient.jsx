"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ChatClient({ roomId }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [canManageMessages, setCanManageMessages] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [replyDraft, setReplyDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sendError, setSendError] = useState("");
  const endOfMessagesRef = useRef(null);

  const pinnedMessages = useMemo(() => {
    return [...messages]
      .filter((item) => item.isPinned)
      .sort((left, right) => {
        const leftTime = new Date(left.pinnedAt || left.createdAt || 0).getTime();
        const rightTime = new Date(right.pinnedAt || right.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  }, [messages]);

  const announcements = useMemo(() => {
    return [...messages]
      .filter((item) => item.type === "announcement")
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt || 0).getTime();
        const rightTime = new Date(right.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  }, [messages]);

  const upsertMessage = (incoming) => {
    if (!incoming?._id) return;

    setMessages((current) => {
      const existingIndex = current.findIndex((item) => item._id === incoming._id);

      if (existingIndex < 0) {
        return [...current, incoming];
      }

      const next = [...current];
      next[existingIndex] = { ...next[existingIndex], ...incoming };
      return next;
    });
  };

  const updatePinnedMessage = (incoming) => {
    if (!incoming?.message?._id) return;

    setMessages((current) => {
      const next = [...current];
      const index = next.findIndex((item) => item._id === incoming.message._id);

      if (index >= 0) {
        next[index] = { ...next[index], ...incoming.message };
      }

      return next;
    });
  };

  const removeMessageFromState = (messageId) => {
    setMessages((current) => current.filter((item) => item._id !== messageId));
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setLoadError("");

      try {
        const [messagesRes, membersRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}/messages`, { cache: "no-store" }),
          fetch(`/api/rooms/${roomId}/members`, { cache: "no-store" }),
        ]);

        const messagesData = await messagesRes.json();
        const membersData = await membersRes.json();

        if (!messagesRes.ok) {
          throw new Error(messagesData.error || "Failed to fetch messages");
        }

        if (!membersRes.ok) {
          throw new Error(membersData.error || "Failed to fetch room info");
        }

        if (isMounted) {
          setMessages(messagesData.messages || []);
          setCanManageMessages(Boolean(membersData.canManageMembers));
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
    if (!roomId || !session?.user) return;

    if (!socket.connected) {
      socket.connect();
    }

    const onReceiveMessage = (data) => {
      if (data?.roomId !== roomId) return;
      upsertMessage(data);
    };

    const onRoomUsers = (payload) => {
      if (payload?.roomId !== roomId) return;
      setOnlineUsers(payload.users || []);
    };

    const onAnnouncementCreated = (data) => {
      if (data?.roomId !== roomId) return;
      upsertMessage(data);
    };

    const onMessagePinned = (data) => {
      if (data?.roomId !== roomId) return;
      updatePinnedMessage(data);
    };

    const onMessageDeleted = (data) => {
      if (data?.roomId !== roomId) return;
      removeMessageFromState(data.messageId);
    };

    socket.on("receiveMessage", onReceiveMessage);
    socket.on("roomUsers", onRoomUsers);
    socket.on("announcementCreated", onAnnouncementCreated);
    socket.on("messagePinned", onMessagePinned);
    socket.on("messageDeleted", onMessageDeleted);

    socket.emit("joinRoom", {
      roomId,
      user: {
        id: session.user.id || session.user.email,
        name: session.user.name,
        email: session.user.email,
      },
    }, (snapshot) => {
      if (snapshot?.roomId === roomId) {
        setOnlineUsers(snapshot.users || []);
      }
    });

    return () => {
      socket.emit("leaveRoom", { roomId });
      socket.off("receiveMessage", onReceiveMessage);
      socket.off("roomUsers", onRoomUsers);
      socket.off("announcementCreated", onAnnouncementCreated);
      socket.off("messagePinned", onMessagePinned);
      socket.off("messageDeleted", onMessageDeleted);
    };
  }, [roomId, session?.user]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const markRoomAsSeen = async () => {
    if (!session?.user || !roomId) return;

    try {
      await fetch("/api/room/last-seen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
    } catch {
      // Best-effort sync; unread endpoint will still compute from latest successful write.
    }
  };

  useEffect(() => {
    if (!session?.user || loading) return;

    const timer = setTimeout(() => {
      markRoomAsSeen();
    }, 500);

    return () => clearTimeout(timer);
  }, [roomId, loading, messages.length, session?.user]);

  const sendMessage = async () => {
    if (!session) return;

    if (!message.trim()) return;

    setSendError("");

    const replyPayload = replyDraft
      ? {
          messageId: replyDraft.messageId || null,
          userId: replyDraft.userId || null,
          senderName: replyDraft.senderName || "User",
          message: replyDraft.message || "",
        }
      : null;

    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, replyTo: replyPayload }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      const sentMessage = {
        _id: data.message._id,
        roomId,
        senderId: data.message.senderId,
        senderName: data.message.senderName,
        message: data.message.message,
        type: data.message.type,
        isPinned: data.message.isPinned,
        pinnedAt: data.message.pinnedAt,
        replyTo: {
          ...(data.message.replyTo || {}),
          userId: replyPayload?.userId || data.message.replyTo?.userId || null,
        },
        time: data.message.time,
      };

      socket.emit("sendMessage", sentMessage);

      upsertMessage(sentMessage);
      setMessage("");
      setReplyDraft(null);
    } catch (err) {
      setSendError(err.message || "Failed to send message");
    }
  };

  const postAnnouncement = async () => {
    if (!canManageMessages) return;
    if (!announcementText.trim()) return;

    setSendError("");

    try {
      const response = await fetch("/api/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, message: announcementText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to post announcement");
      }

      socket.emit("announcementCreated", {
        _id: data.message._id,
        roomId,
        senderName: data.message.senderName,
        message: data.message.message,
        type: data.message.type,
        isPinned: data.message.isPinned,
        pinnedAt: data.message.pinnedAt,
        time: data.message.time,
      });

      upsertMessage(data.message);
      setAnnouncementText("");
      setNotificationsOpen(false);
    } catch (err) {
      setSendError(err.message || "Failed to post announcement");
    }
  };

  const togglePin = async (messageId) => {
    if (!canManageMessages) return;

    setSendError("");

    try {
      const response = await fetch("/api/message/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, messageId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update pin");

      socket.emit("messagePinned", {
        roomId,
        message: data.message,
      });

      updatePinnedMessage({ roomId, message: data.message });
      setContextMenu(null);
    } catch (err) {
      setSendError(err.message || "Failed to update pin");
    }
  };

  const deleteMessage = async (messageId) => {
    if (!canManageMessages) return;

    setSendError("");

    try {
      const response = await fetch(`/api/rooms/${roomId}/messages/${messageId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete message");

      socket.emit("messageDeleted", { roomId, messageId });
      removeMessageFromState(messageId);
      setContextMenu(null);
    } catch (err) {
      setSendError(err.message || "Failed to delete message");
    }
  };

  const scrollToMessage = (messageId) => {
    const target = document.getElementById(`message-${messageId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const copyMessageText = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      setContextMenu(null);
    } catch {
      setSendError("Failed to copy message");
    }
  };

  const replyToMessage = (msg) => {
    setReplyDraft({
      messageId: msg?._id || null,
      userId: msg?.senderId || null,
      senderName: msg?.senderName || "User",
      message: String(msg?.message || "").trim(),
    });
    setContextMenu(null);
  };

  const openContextMenu = (event, msg) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      messageId: msg._id,
      senderId: msg.senderId || null,
      senderName: msg.senderName,
      text: msg.message,
      isPinned: Boolean(msg.isPinned),
      x: event.clientX,
      y: event.clientY,
    });
  };

  if (loading) {
    return <p>Loading room...</p>;
  }

  if (loadError) {
    return (
      <div>
        <p className="error-banner">{loadError}</p>
        <button className="ghost-btn" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }


  return (
    <div onClick={() => setContextMenu(null)} onContextMenuCapture={() => setContextMenu(null)}>
      {sendError && <p className="error-banner">{sendError}</p>}

      <section className="notification-panel">
        <div className="notification-panel-head">
          <div>
            <p className="dashboard-kicker">Announcements</p>
            <h2>Announcements</h2>
          </div>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setNotificationsOpen((current) => !current)}
          >
            {notificationsOpen ? "Close" : "Open"}
          </button>
        </div>

        {notificationsOpen && (
          <div className="notification-panel-body">
            <div className="notification-tabs">
              <button type="button" className="notification-tab active">
                Announcements ({announcements.length})
              </button>
            </div>

            {canManageMessages && (
              <div className="notification-compose">
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Post an announcement for the room..."
                  rows={3}
                />
                <button className="secondary-btn" onClick={postAnnouncement}>
                  Post Announcement
                </button>
              </div>
            )}

            {announcements.length === 0 ? (
              <p className="message-empty">No announcements yet.</p>
            ) : (
              <div className="announcement-feed">
                {announcements.map((item) => (
                  <article key={item._id} className="announcement-feed-item">
                    <div className="announcement-feed-meta">
                      <span>{item.senderName}</span>
                      <span>{item.time}</span>
                    </div>
                    <p>{item.message}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="pinned-section">
        <div className="pinned-section-head">
          <h2>Pinned</h2>
          <p>{pinnedMessages.length} pinned message{pinnedMessages.length === 1 ? "" : "s"}</p>
        </div>

        {pinnedMessages.length === 0 ? (
          <p className="message-empty pinned-empty">No pinned messages yet.</p>
        ) : (
          <div className="pinned-list">
            {pinnedMessages.map((item) => (
              <button
                key={item._id}
                type="button"
                className="pinned-card"
                onClick={() => scrollToMessage(item._id)}
              >
                <div className="message-meta">
                  <span>{item.senderName}</span>
                  <span>{item.time}</span>
                </div>
                <p>{item.message}</p>
                <span className="pinned-badge">Pinned</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="message-board">
        {messages.length === 0 ? (
          <p className="message-empty">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderName === (session?.user?.name || session?.user?.email);
            const isReply = Boolean(msg.replyTo?.senderName && msg.replyTo?.message);

            return (
              <div
                id={`message-${msg._id}`}
                key={`${msg._id || i}-${msg.time}`}
                className={`message-item ${msg.type === "announcement" ? "announcement-message" : ""} ${isMe ? "mine" : ""} ${isReply ? "reply-message-theme" : ""}`}
                onContextMenu={(event) => openContextMenu(event, msg)}
              >
                <div className="message-meta">
                  <span>{msg.senderName}</span>
                  <span>
                    {msg.type === "announcement" ? "Announcement" : msg.time}
                    {msg.isPinned ? " • Pinned" : ""}
                  </span>
                </div>

                {msg.replyTo?.senderName && msg.replyTo?.message && (
                  <div className="reply-quote reply-quote-inline">
                    <span className="reply-quote-label">Replying to {msg.replyTo.senderName}</span>
                    <div className="reply-quote-body">
                      <span className="reply-quote-bar" aria-hidden="true" />
                      <div className="reply-quote-content">
                        <span className="reply-quote-name">{msg.replyTo.senderName}</span>
                        <p>{msg.replyTo.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                <p>{msg.message}</p>
              </div>
            );
          })
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {contextMenu && (
        <div
          className="message-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="menu-item"
            onClick={() =>
              replyToMessage({
                _id: contextMenu.messageId,
                senderId: contextMenu.senderId,
                senderName: contextMenu.senderName,
                message: contextMenu.text,
              })
            }
          >
            <span className="menu-icon" aria-hidden="true">↩</span>
            <span>Reply</span>
          </button>

          <button
            type="button"
            className="menu-item"
            onClick={() => copyMessageText(contextMenu.text)}
          >
            <span className="menu-icon" aria-hidden="true">⧉</span>
            <span>Copy</span>
          </button>

          {canManageMessages && (
            <>
              <div className="menu-separator" />
              <button
                type="button"
                className="menu-item"
                onClick={() => togglePin(contextMenu.messageId)}
              >
                <span className="menu-icon" aria-hidden="true">📌</span>
                <span>{contextMenu.isPinned ? "Unpin" : "Pin"}</span>
              </button>
              <div className="menu-separator" />
              <button
                type="button"
                className="menu-item danger-btn"
                onClick={() => deleteMessage(contextMenu.messageId)}
              >
                <span className="menu-icon" aria-hidden="true">🗑</span>
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}

      {onlineUsers.length > 0 && (
        <div className="online-users-wrap">
          <p className="online-users-label">Active in this room</p>
          <div className="online-users-list">
            {onlineUsers.map((user) => (
              <span key={`${user.id}-${user.email}`} className="online-user-pill">
                {user.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="composer">
        {replyDraft && (
          <div className="reply-quote reply-quote-composer">
            <div className="reply-preview-head">
              <span className="reply-quote-label">Replying to {replyDraft.senderName}</span>
              <button
                type="button"
                className="reply-preview-close"
                onClick={() => setReplyDraft(null)}
                aria-label="Cancel reply"
              >
                ×
              </button>
            </div>

            <div className="reply-quote-body">
              <span className="reply-quote-bar" aria-hidden="true" />
              <div className="reply-quote-content">
                <span className="reply-quote-name">{replyDraft.senderName}</span>
                <p>{replyDraft.message}</p>
              </div>
            </div>
          </div>
        )}

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
  );
}