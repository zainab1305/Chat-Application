import ChatClient from "../../ChatClient";

export default async function RoomChatPage({ params }) {
  const { roomId } = await params;

  return <ChatClient roomId={roomId} />;
}