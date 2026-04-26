const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const roomUsers = new Map();
const userSockets = new Map();
const SOCKET_SERVER_SECRET = process.env.SOCKET_SERVER_SECRET || "";

function isAuthorized(req) {
  if (!SOCKET_SERVER_SECRET) return true;
  return req.headers["x-socket-server-secret"] === SOCKET_SERVER_SECRET;
}

function getUserRoom(userId) {
  return `user:${userId}`;
}

function addUserSocket(userId, socketId) {
  if (!userId || !socketId) return;

  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }

  userSockets.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  if (!userId || !socketId) return;

  const socketIds = userSockets.get(userId);
  if (!socketIds) return;

  socketIds.delete(socketId);

  if (socketIds.size === 0) {
    userSockets.delete(userId);
  }
}

function emitRoomUsers(roomId) {
  const usersInRoom = roomUsers.get(roomId);
  const onlineUsers = usersInRoom ? Array.from(usersInRoom.values()) : [];

  return {
    roomId,
    users: onlineUsers,
    count: onlineUsers.length,
  };
}

function getActiveRoomUserIds(roomId) {
  const usersInRoom = roomUsers.get(roomId);
  if (!usersInRoom) return [];

  return Array.from(usersInRoom.values())
    .map((user) => String(user.id || ""))
    .filter(Boolean)
    .filter((userId, index, list) => list.indexOf(userId) === index);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("welcome", "Welcome to the server!");

  socket.on("registerUser", ({ userId }) => {
    if (!userId) return;

    const normalizedUserId = String(userId);
    const previousUserId = socket.data.userId ? String(socket.data.userId) : "";

    if (previousUserId && previousUserId !== normalizedUserId) {
      removeUserSocket(previousUserId, socket.id);
      socket.leave(getUserRoom(previousUserId));
    }

    socket.data.userId = normalizedUserId;
    socket.join(getUserRoom(normalizedUserId));
    addUserSocket(normalizedUserId, socket.id);
  });

  socket.on("joinRoom", ({ roomId, user }, callback) => {
    if (!roomId || !user?.id) return;

    if (!socket.data.userId) {
      socket.data.userId = String(user.id);
      socket.join(getUserRoom(socket.data.userId));
      addUserSocket(socket.data.userId, socket.id);
    }

    socket.join(roomId);

    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Map());
    }

    const usersInRoom = roomUsers.get(roomId);
    usersInRoom.set(socket.id, {
      id: user.id,
      name: user.name || user.email || "Anonymous",
      email: user.email || "",
    });

    const snapshot = emitRoomUsers(roomId);

    socket.emit("roomJoined", { roomId });
    io.to(roomId).emit("roomUsers", snapshot);

    if (typeof callback === "function") {
      callback(snapshot);
    }

    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on("leaveRoom", ({ roomId }) => {
    if (!roomId) return;

    const usersInRoom = roomUsers.get(roomId);
    if (usersInRoom) {
      usersInRoom.delete(socket.id);

      if (usersInRoom.size === 0) {
        roomUsers.delete(roomId);
      }
    }

    socket.leave(roomId);
    const snapshot = emitRoomUsers(roomId);
    io.to(roomId).emit("roomUsers", snapshot);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  socket.on("sendMessage", (data) => {
    console.log("Message received:", data);

    if (!data?.roomId) return;

    io.to(data.roomId).emit("receiveMessage", data);
    io.emit("newMessageNotification", {
      roomId: data.roomId,
      messageId: data._id || null,
    });

    if (
      data?.replyTo?.userId
      && String(data.replyTo.userId) !== String(data.senderId || "")
    ) {
      io.emit("dashboardNotification", {
        type: "reply",
        roomId: data.roomId,
        messageId: data._id || null,
        actorName: data.senderName || "Someone",
        targetUserId: String(data.replyTo.userId),
        preview: data.message || "",
        createdAt: new Date().toISOString(),
      });
    }
  });

  socket.on("announcementCreated", (data) => {
    if (!data?.roomId) return;

    io.to(data.roomId).emit("announcementCreated", data);
    io.to(data.roomId).emit("receiveMessage", data);
    io.emit("newMessageNotification", {
      roomId: data.roomId,
      messageId: data._id || null,
    });

    io.emit("dashboardNotification", {
      type: "announcement",
      roomId: data.roomId,
      messageId: data._id || null,
      actorName: data.senderName || "Moderator",
      preview: data.message || "",
      createdAt: new Date().toISOString(),
    });
  });

  socket.on("memberJoinedNotification", (payload) => {
    if (!payload?.roomId || !payload?.userId) return;

    io.emit("dashboardNotification", {
      type: "member-joined",
      roomId: payload.roomId,
      actorName: payload.userName || "A member",
      actorUserId: String(payload.userId),
      createdAt: new Date().toISOString(),
    });
  });

  socket.on("messagePinned", (data) => {
    if (!data?.roomId || !data?.message?._id) return;

    io.to(data.roomId).emit("messagePinned", data);
  });

  socket.on("messageDeleted", (data) => {
    if (!data?.roomId || !data?.messageId) return;

    io.to(data.roomId).emit("messageDeleted", data);
  });

  socket.on("roleUpdated", (payload) => {
    if (!payload?.roomId || !payload?.targetUserId) return;

    io.to(payload.roomId).emit("roleUpdated", {
      roomId: payload.roomId,
      targetUserId: payload.targetUserId,
      role: payload.role || "moderator",
    });
  });

  socket.on("userRemoved", (payload) => {
    if (!payload?.roomId || !payload?.targetUserId) return;

    io.to(payload.roomId).emit("userRemoved", {
      roomId: payload.roomId,
      targetUserId: payload.targetUserId,
    });

    io.emit("dashboardNotification", {
      type: "member-removed",
      roomId: payload.roomId,
      targetUserId: payload.targetUserId,
      actorName: payload.actorName || "Manager",
      createdAt: new Date().toISOString(),
    });
  });

  socket.on("disconnecting", () => {
    const activeRooms = Array.from(socket.rooms).filter((roomId) => roomId !== socket.id);

    activeRooms.forEach((roomId) => {
      const usersInRoom = roomUsers.get(roomId);
      if (!usersInRoom) return;

      usersInRoom.delete(socket.id);

      if (usersInRoom.size === 0) {
        roomUsers.delete(roomId);
      }

      const snapshot = emitRoomUsers(roomId);
      io.to(roomId).emit("roomUsers", snapshot);
    });
  });

  socket.on("disconnect", () => {
    if (socket.data.userId) {
      removeUserSocket(String(socket.data.userId), socket.id);
    }

    console.log("User disconnected:", socket.id);
  });
});

app.get("/presence/rooms/:roomId/users", (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { roomId } = req.params;
  const userIds = getActiveRoomUserIds(roomId);

  return res.json({ roomId, userIds, count: userIds.length });
});

app.post("/emit/notifications", (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const notifications = Array.isArray(req.body?.notifications) ? req.body.notifications : [];

  notifications.forEach((notification) => {
    const recipientId = String(notification?.recipientId || "");
    if (!recipientId) return;

    io.to(getUserRoom(recipientId)).emit("notificationCreated", notification);
  });

  return res.json({ delivered: notifications.length });
});

app.get("/", (req, res) => {
  res.send("Socket.IO server running...");
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
