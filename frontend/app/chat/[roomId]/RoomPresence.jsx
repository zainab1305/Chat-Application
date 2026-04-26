"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { socket } from "@/lib/socket";

export default function RoomPresence({ roomId }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (!roomId || !session?.user?.id) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("registerUser", { userId: session.user.id });
    socket.emit("joinRoom", {
      roomId,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    });

    return () => {
      socket.emit("leaveRoom", { roomId });
    };
  }, [roomId, session?.user?.email, session?.user?.id, session?.user?.name]);

  return null;
}
