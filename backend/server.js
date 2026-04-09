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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("welcome", "Welcome to the server!");

  socket.on("joinRoom", ({ roomId }) => {
    if (!roomId) return;

    socket.join(roomId);
    socket.emit("roomJoined", { roomId });
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on("leaveRoom", ({ roomId }) => {
    if (!roomId) return;

    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  socket.on("sendMessage", (data) => {
    console.log("Message received:", data);

    if (!data?.roomId) return;

    io.to(data.roomId).emit("receiveMessage", data);
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