import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getRoomAccess } from "@/lib/roomRoles";
import ChatClient from "../../ChatClient";

export default async function RoomChatPage({ params }) {
  const { roomId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const access = await getRoomAccess(session, roomId);
  if (access.error) {
    redirect("/dashboard");
  }

  const room = access.room;

  return <ChatClient roomId={roomId} roomCode={room.code} roomName={room.name} />;
}