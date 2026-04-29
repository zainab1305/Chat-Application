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
  const [pinnedOpen, setPinnedOpen] = useState(false);
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

    socket.emit(
      "joinRoom",
      {
        roomId,
        user: {
          id: session.user.id || session.user.email,
          name: session.user.name,
          email: session.user.email,
        },
      },
      (snapshot) => {
        if (snapshot?.roomId === roomId) {
          setOnlineUsers(snapshot.users || []);
        }
      }
    );

    return () => {
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
  }, [isNearBottom, messages]);

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
      // Best-effort sync
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
      <div className="flex h-full gap-4 p-4 bg-white/50">
        <div className="flex-1 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="w-72 space-y-4">
          <div className="h-32 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-4">{loadError}</p>
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full bg-white overflow-hidden"
      onClick={() => setContextMenu(null)}
      onContextMenuCapture={() => setContextMenu(null)}
    >
      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top toolbar with filters */}
        {(announcements.length > 0 || pinnedMessages.length > 0) && (
          <div className="border-b border-slate-200 px-6 py-3 flex gap-3">
            {announcements.length > 0 && (
              <button
                onClick={() => setAnnouncementsOpen(!announcementsOpen)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  announcementsOpen
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                📢 Announcements ({announcements.length})
              </button>
            )}
            {pinnedMessages.length > 0 && (
              <button
                onClick={() => setPinnedOpen(!pinnedOpen)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pinnedOpen
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                📌 Pinned ({pinnedMessages.length})
              </button>
            )}
          </div>
        )}

        {/* Announcements Panel */}
        {announcementsOpen && announcements.length > 0 && (
          <div className="border-b border-slate-200 bg-blue-50 p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Announcements</h3>
              <button
                onClick={() => setAnnouncementsOpen(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            {canManageMessages && (
              <div className="mb-3 pb-3 border-b border-blue-200">
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Post an announcement..."
                  rows={2}
                  className="w-full p-2 text-sm border border-blue-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={postAnnouncement}
                  className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Post
                </button>
              </div>
            )}
            <div className="space-y-2">
              {announcements.slice(0, 5).map((item) => (
                <div key={item._id} className="bg-white p-2 rounded text-sm border-l-2 border-blue-400">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-medium">{item.senderName}</span>
                    <span>{item.time}</span>
                  </div>
                  <p className="text-slate-800 mt-1">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pinned Messages Panel */}
        {pinnedOpen && pinnedMessages.length > 0 && (
          <div className="border-b border-slate-200 bg-amber-50 p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Pinned Messages</h3>
              <button
                onClick={() => setPinnedOpen(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {pinnedMessages.map((item) => (
                <button
                  key={item._id}
                  onClick={() => scrollToMessage(item._id)}
                  className="w-full bg-white p-2 rounded text-sm border-l-2 border-amber-400 hover:bg-amber-100 transition-colors text-left"
                >
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-medium">{item.senderName}</span>
                    <span>{item.time}</span>
                  </div>
                  <p className="text-slate-800 mt-1 truncate">{item.message}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div 
          ref={messageBoardRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-slate-500 text-center">
                No messages yet. Start the conversation! 💬
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderName === currentUserLabel;
              const isAnnouncement = msg.type === "announcement";

              return (
                <div
                  id={`message-${msg._id}`}
                  key={`${msg._id || i}-${msg.time}`}
                  className={`flex items-end gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                  onContextMenu={(event) => openContextMenu(event, msg)}
                >
                  {/* Avatar placeholder */}
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    isMe 
                      ? "bg-blue-500 text-white ring-4 ring-slate-100" 
                      : isAnnouncement 
                      ? "bg-purple-500 text-white ring-4 ring-purple-50" 
                      : "bg-slate-300 text-slate-700 ring-4 ring-slate-50"
                  }`}>
                    {msg.senderName.charAt(0).toUpperCase()}
                  </div>

                  {/* Message bubble */}
                  <div className={`flex-1 max-w-md ${isMe ? "text-right" : ""}`}>
                    <div className="flex items-center gap-2" style={{ justifyContent: isMe ? "flex-end" : "flex-start" }}>
                      <span className={`text-sm font-semibold ${isMe ? "text-slate-700" : "text-slate-900"}`}>
                        {isMe ? "You" : msg.senderName}
                      </span>
                      <span className={`text-xs ${isMe ? "text-slate-500" : "text-slate-500"}`}>{msg.time}</span>
                      {msg.isPinned && <span className={`${isMe ? "text-slate-400" : "text-amber-600"} text-xs`}>📌</span>}
                    </div>

                    {/* Reply quote if present */}
                    {msg.replyTo?.senderName && msg.replyTo?.message && (
                      <div className={`mt-1.5 p-2 rounded border-l-2 border-slate-300 bg-slate-50 text-sm ${
                        isMe ? "text-right" : ""
                      }`}>
                        <p className="text-xs text-slate-600 font-medium">
                          ↳ {msg.replyTo.senderName}
                        </p>
                        <p className="text-slate-700 truncate">{msg.replyTo.message}</p>
                      </div>
                    )}

                    {/* Main message */}
                    <div className={`mt-1 px-4 py-2.5 rounded-2xl shadow-sm ${
                      isMe
                        ? "bg-gradient-to-br from-blue-500 to-blue-600"
                        : isAnnouncement
                        ? "bg-purple-100 text-purple-900 font-medium"
                        : "bg-slate-100 text-slate-900"
                    }`}>
                      <p
                        className={`break-words whitespace-pre-wrap font-medium ${isMe ? "text-white" : "text-inherit"}`}
                        style={isMe ? { color: "#ffffff" } : undefined}
                      >
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Reply Draft */}
        {replyDraft && (
          <div className="border-t border-slate-200 bg-blue-50 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="text-xs text-blue-700 font-medium">Replying to {replyDraft.senderName}</p>
                <p className="text-slate-600 truncate">{replyDraft.message}</p>
              </div>
              <button
                onClick={() => setReplyDraft(null)}
                className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-200 bg-white p-4">
          {sendError && (
            <div className="mb-2 p-2 bg-red-50 text-red-700 text-sm rounded">
              {sendError}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message... (Enter to send)"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button 
              onClick={sendMessage}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Online Members */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Active Now ({onlineUsers.length})
          </h3>
          <p className="text-xs text-slate-600 mb-3">Live member presence</p>
          
          {onlineUsers.length > 0 ? (
            <div className="space-y-2">
              {onlineUsers.map((user) => (
                <div
                  key={`${user.id}-${user.email}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-green-600">Online</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No one online right now</p>
          )}
        </div>

        {/* Invite Code */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Invite Code</h3>
          <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-300">
            <code className="flex-1 font-mono text-sm font-bold text-slate-700">{roomCode}</code>
            <button
              onClick={copyInviteCode}
              className="px-2 py-1 bg-white hover:bg-slate-200 rounded text-xs font-medium transition-colors"
            >
              {copiedInviteCode ? "✓" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-slate-200 z-50"
          style={{
            left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px`,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => replyToMessage({
              _id: contextMenu.messageId,
              senderId: contextMenu.senderId,
              senderName: contextMenu.senderName,
              message: contextMenu.text,
            })}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg"
          >
            ↩ Reply
          </button>
          <button
            onClick={() => copyMessageText(contextMenu.text)}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            ⧉ Copy
          </button>
          {canManageMessages && (
            <>
              <div className="border-t border-slate-200" />
              <button
                onClick={() => togglePin(contextMenu.messageId)}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                📌 {contextMenu.isPinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => deleteMessage(contextMenu.messageId)}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
              >
                🗑 Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white text-sm font-medium z-50 animate-pulse ${
          toast.type === "error" ? "bg-red-500" : "bg-green-500"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
