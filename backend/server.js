const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const roomUsers = new Map();

function emitRoomUsers(roomId) {
  const usersInRoom = roomUsers.get(roomId);
  const onlineUsers = usersInRoom ? Array.from(usersInRoom.values()) : [];

  return {
    roomId,
    users: onlineUsers,
    count: onlineUsers.length,
  };
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("welcome", "Welcome to the server!");

  socket.on("joinRoom", ({ roomId, user }, callback) => {
    if (!roomId || !user?.id) return;

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
    console.log("User disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Socket.IO server running...");
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});