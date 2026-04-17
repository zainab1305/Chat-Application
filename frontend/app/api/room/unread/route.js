import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Room from "@/models/Room";
import { getMemberEntry, getUserFromSession, normalizeLegacyRoomMembers } from "@/lib/roomRoles";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await getUserFromSession(session);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const rooms = await Room.find({
      $or: [{ "members.userId": user._id }, { members: user._id }],
    }).select("_id members createdAt");

    const unreadByRoom = await Promise.all(
      rooms.map(async (room) => {
        await normalizeLegacyRoomMembers(room);

        const member = getMemberEntry(room, user._id);

        const lastSeen = member?.lastSeen || member?.joinedAt || room.createdAt || new Date(0);

        const unreadCount = await Message.countDocuments({
          roomId: room._id,
          createdAt: { $gt: lastSeen },
          senderId: { $ne: user._id },
        });

        return {
          roomId: room._id.toString(),
          unreadCount,
        };
      })
    );

    const totalUnread = unreadByRoom.reduce((sum, item) => sum + (item.unreadCount || 0), 0);

    return NextResponse.json(
      { unread: unreadByRoom, totalUnread },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
