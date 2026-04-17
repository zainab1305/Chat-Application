import { redirect } from "next/navigation";

export default async function RoomPage({ params }) {
  const { roomId } = await params;

  redirect(`/chat/${roomId}/chat`);
}
