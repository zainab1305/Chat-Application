import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import RoomNav from "./RoomNav";
import RoomActions from "./RoomActions";
import { getRoomAccess } from "@/lib/roomRoles";

export default async function RoomLayout({ children, params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { roomId } = await params;

  const access = await getRoomAccess(session, roomId);

  if (access.error) {
    redirect("/dashboard");
  }

  const room = access.room;
  const isOwner = access.isAdmin;

  return (
    <div className="chat-page">
      <div className="chat-shell room-shell">
        <div className="chat-header room-header">
          <div className="room-header-copy">
            <p className="dashboard-kicker">Room</p>
            <h1>{room.name}</h1>
            <p className="room-header-code">Room Code: {room.code}</p>
          </div>

          <RoomActions roomId={roomId} roomCode={room.code} isOwner={isOwner} />
        </div>

        <RoomNav roomId={roomId} />

        <div className="room-content">{children}</div>
      </div>
    </div>
  );
}
