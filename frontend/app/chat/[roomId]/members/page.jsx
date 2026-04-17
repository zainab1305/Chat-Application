import MembersClient from "../MembersClient";

export default async function RoomMembersPage({ params }) {
  const { roomId } = await params;

  return <MembersClient roomId={roomId} />;
}