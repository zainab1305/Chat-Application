"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ChatClient({ roomId, roomCode }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [canManageMessages, setCanManageMessages] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [replyDraft, setReplyDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sendError, setSendError] = useState("");
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [pinnedPreviewOpen, setPinnedPreviewOpen] = useState(true);
  const [pinnedDrawerOpen, setPinnedDrawerOpen] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [toast, setToast] = useState(null);
  const endOfMessagesRef = useRef(null);
  const messageBoardRef = useRef(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), 2200);
  }

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

  const currentUserLabel = useMemo(
    () => session?.user?.name || session?.user?.email || "You",
    [session?.user?.name, session?.user?.email]
  );

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
    if (!isNearBottom) return;

    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const board = messageBoardRef.current;
    if (!board) return undefined;

    const threshold = 84;

    const updatePosition = () => {
      const distanceFromBottom = board.scrollHeight - board.scrollTop - board.clientHeight;
      setIsNearBottom(distanceFromBottom <= threshold);
    };

    updatePosition();
    board.addEventListener("scroll", updatePosition, { passive: true });

    return () => board.removeEventListener("scroll", updatePosition);
  }, []);

  const markRoomAsSeen = useCallback(async () => {
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
  }, [roomId, session?.user]);

  useEffect(() => {
    if (!session?.user || loading) return;

    const timer = setTimeout(() => {
      markRoomAsSeen();
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, messages.length, markRoomAsSeen, session?.user]);

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
      showToast("Message sent");
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
      setAnnouncementsOpen(false);
      showToast("Announcement posted");
    } catch (err) {
      setSendError(err.message || "Failed to post announcement");
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode || "");
      setCopiedInviteCode(true);
      window.setTimeout(() => setCopiedInviteCode(false), 1400);
      showToast("Room code copied");
    } catch {
      setSendError("Failed to copy invite code");
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
      showToast(data.message?.isPinned ? "Message pinned" : "Message unpinned");
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
      showToast("Message deleted");
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
      showToast("Message copied");
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
    return (
      <div className="room-chat-layout chat-loading-layout" aria-label="Loading room">
        <section className="room-chat-main">
          <div className="chat-loading-stack">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="chat-skeleton-message">
                <div className="skeleton-line skeleton-line-title" />
                <div className="skeleton-line skeleton-line-text" />
                <div className="skeleton-line skeleton-line-text short" />
              </div>
            ))}
          </div>
        </section>

        <aside className="chat-context-sidebar">
          <div className="chat-context-card chat-skeleton-card">
            <div className="skeleton-line skeleton-line-title" />
            <div className="skeleton-line skeleton-line-text" />
            <div className="skeleton-line skeleton-line-button" />
          </div>
          <div className="chat-context-card chat-skeleton-card">
            <div className="skeleton-line skeleton-line-title" />
            <div className="skeleton-line skeleton-line-text" />
            <div className="skeleton-line skeleton-line-button" />
          </div>
        </aside>
      </div>
    );
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
    <div
      className="room-chat-layout"
      onClick={() => setContextMenu(null)}
      onContextMenuCapture={() => setContextMenu(null)}
    >
      {sendError && <p className="error-banner">{sendError}</p>}

      <section className="room-chat-main">
        <div className="chat-collapsible-row">
          <button
            type="button"
            className={`ghost-btn room-filter-btn ${announcementsOpen ? "active" : ""}`}
            onClick={() => setAnnouncementsOpen((current) => !current)}
          >
            Announcements <span className="room-filter-count">{announcements.length}</span>
          </button>
          <button
            type="button"
            className={`ghost-btn room-filter-btn ${pinnedPreviewOpen ? "active" : ""}`}
            onClick={() => setPinnedPreviewOpen((current) => !current)}
          >
            Pinned <span className="room-filter-count">{pinnedMessages.length}</span>
          </button>
        </div>

        {announcementsOpen && (
          <section className="notification-panel">
            <div className="notification-panel-head">
              <div>
                <p className="dashboard-kicker">Announcements</p>
                <h2>Announcements</h2>
              </div>
            </div>

            <div className="notification-panel-body">
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
                  {announcements.slice(0, 3).map((item) => (
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
          </section>
        )}

        {pinnedPreviewOpen && (
          <section className="pinned-section pinned-preview-panel">
            <div className="pinned-section-head">
              <h2>Pinned ({pinnedMessages.length})</h2>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setPinnedDrawerOpen(true)}
                disabled={pinnedMessages.length === 0}
              >
                Open Drawer
              </button>
            </div>

            {pinnedMessages.length === 0 ? (
              <p className="message-empty pinned-empty">No pinned messages yet.</p>
            ) : (
              <div className="pinned-list">
                {pinnedMessages.slice(0, 2).map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className="pinned-card"
                    onClick={() => {
                      scrollToMessage(item._id);
                      setPinnedDrawerOpen(true);
                    }}
                  >
                    <div className="message-meta">
                      <span>{item.senderName}</span>
                      <span>{item.time}</span>
                    </div>
                    <p>{item.message}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="message-board chat-message-board" ref={messageBoardRef}>
          {messages.length === 0 ? (
            <p className="message-empty">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderName === currentUserLabel;
              const isReply = Boolean(msg.replyTo?.senderName && msg.replyTo?.message);

              return (
                <div
                  id={`message-${msg._id}`}
                  key={`${msg._id || i}-${msg.time}`}
                  className={`message-item ${msg.type === "announcement" ? "announcement-message" : ""} ${isMe ? "mine" : ""} ${isReply ? "reply-message-theme" : ""}`}
                  onContextMenu={(event) => openContextMenu(event, msg)}
                >
                  <p className="message-sender">{isMe ? "You" : msg.senderName}</p>

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

                  <p className="message-body">{msg.message}</p>
                  <p className="message-time-small">
                    {msg.type === "announcement" ? "Announcement" : msg.time}
                    {msg.isPinned ? " • Pinned" : ""}
                  </p>
                </div>
              );
            })
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <div className="composer chat-composer-sticky">
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

          <div className="chat-input-row">
            <button type="button" className="ghost-btn chat-mini-icon" aria-label="Emoji picker">
              😊
            </button>
            <button type="button" className="ghost-btn chat-mini-icon" aria-label="Attach file">
              📎
            </button>
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
      </section>

      <aside className="chat-context-sidebar">
        <div className="chat-context-card">
          <p className="dashboard-kicker">Active now</p>
          <h3>{onlineUsers.length} online</h3>
          <p className="chat-context-sub">Live member presence in this room</p>

          {onlineUsers.length > 0 ? (
            <div className="online-users-list chat-context-users">
              {onlineUsers.map((user) => (
                <span key={`${user.id}-${user.email}`} className="online-user-pill">
                  {user.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="chat-context-sub">No one is online right now.</p>
          )}
        </div>

        <div className="chat-context-card">
          <p className="dashboard-kicker">Invite code</p>
          <h3>{roomCode}</h3>
          <button type="button" className="secondary-btn" onClick={copyInviteCode}>
            {copiedInviteCode ? "Copied" : "Copy Code"}
          </button>
        </div>
      </aside>

      {pinnedDrawerOpen && (
        <aside className="pinned-drawer" onClick={(event) => event.stopPropagation()}>
          <div className="pinned-drawer-head">
            <h3>Pinned ({pinnedMessages.length})</h3>
            <button type="button" className="ghost-btn" onClick={() => setPinnedDrawerOpen(false)}>
              Close
            </button>
          </div>

          {pinnedMessages.length === 0 ? (
            <p className="message-empty">No pinned messages yet.</p>
          ) : (
            <div className="pinned-list">
              {pinnedMessages.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="pinned-card"
                  onClick={() => {
                    scrollToMessage(item._id);
                    setPinnedDrawerOpen(false);
                  }}
                >
                  <div className="message-meta">
                    <span>{item.senderName}</span>
                    <span>{item.time}</span>
                  </div>
                  <p>{item.message}</p>
                </button>
              ))}
            </div>
          )}
        </aside>
      )}

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
    </div>
  );
}
