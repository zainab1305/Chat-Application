import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ChatClient from "../ChatClient";

export default async function RoomChatPage({ params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { roomId } = await params;

  return <ChatClient roomId={roomId} />;
}
