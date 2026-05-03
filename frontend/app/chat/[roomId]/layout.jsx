import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import RoomNav from "./RoomNav";
import RoomActions from "./RoomActions";
import RoomPresence from "./RoomPresence";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import { getRoomAccess } from "@/lib/roomRoles";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

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

  // Fetch creator name for the right sidebar
  let creatorName = "";
  try {
    await connectDB();
    if (room.createdBy) {
      const creator = await User.findById(room.createdBy).select("name email").lean();
      creatorName = creator?.name || creator?.email || "";
    }
  } catch {
    // non-critical
  }

  const memberCount = Array.isArray(room.members) ? room.members.length : 0;

  return (
    <div className="rl-root">
      <RoomPresence roomId={roomId} />

      {/* ── Full-height flex container ── */}
      <div className="rl-shell">

        {/* ── Left Sidebar ── */}
        <LeftSidebar
          workspaceId={roomId}
          workspaceName={room.name}
          workspaceCode={room.code}
          isOwner={isOwner}
          currentUserId={session.user.id || ""}
          currentUserName={session.user.name || session.user.email || ""}
        />

        {/* ── Centre column ── */}
        <div className="rl-centre">
          {/* Header */}
          <div className="rl-header">
            <div className="rl-header-left">
              <p className="rl-header-kicker">Room</p>
              <h1 className="rl-header-title">{room.name}</h1>
              <div className="rl-header-code">
                <code>{room.code}</code>
              </div>
            </div>
            <RoomActions roomId={roomId} roomCode={room.code} isOwner={isOwner} />
          </div>

          {/* Tab navigation */}
          <RoomNav roomId={roomId} />

          {/* Page content */}
          <div className="rl-content">
            {children}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <RightSidebar
          roomId={roomId}
          roomCode={room.code}
          creatorName={creatorName}
          createdAt={room.createdAt}
          memberCount={memberCount}
        />
      </div>
    </div>
  );
}
