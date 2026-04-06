"use client";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;

    socket.emit("sendMessage", message);
    setMessage("");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Next.js Socket Chat</h1>

      <div className="mt-4 flex gap-2">
        <input
          className="border px-3 py-2 rounded w-full"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message..."
        />
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold">Messages:</h2>
        {messages.map((msg, i) => (
          <p key={i} className="mt-2">
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}