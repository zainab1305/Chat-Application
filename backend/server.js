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