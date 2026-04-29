import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import RoomNav from "./RoomNav";
import RoomActions from "./RoomActions";
import RoomPresence from "./RoomPresence";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      <RoomPresence roomId={roomId} />
      
      {/* Modern workspace layout */}
      <div className="flex flex-col h-screen max-w-full">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Room</p>
                  <h1 className="text-2xl font-bold text-slate-900 truncate">{room.name}</h1>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                  <code className="text-xs font-mono text-slate-600">{room.code}</code>
                </div>
              </div>
            </div>
            <RoomActions roomId={roomId} roomCode={room.code} isOwner={isOwner} />
          </div>

          {/* Tabs Navigation */}
          <RoomNav roomId={roomId} />
        </div>

        {/* Main content area - full height */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
