"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { signOut, useSession } from "next-auth/react";

export default function ChatClient() {
  const { data: session } = useSession();

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
    if (!session) return;

    if (!message.trim()) return;

    socket.emit("sendMessage", {
      username: session.user.name,
      email: session.user.email,
      message: message,
      time: new Date().toLocaleTimeString(),
    });

    setMessage("");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Next.js Socket Chat</h1>

        <div className="flex items-center gap-4">
          <p className="text-sm">
            {session?.user?.name} ({session?.user?.email})
          </p>

          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={() => signOut()}
          >
            Logout
          </button>
        </div>
      </div>

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
          <div key={i} className="border p-3 rounded mt-3">
            <p className="font-semibold">{msg.username}</p>
            <p>{msg.message}</p>
            <p className="text-xs text-gray-500">{msg.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}