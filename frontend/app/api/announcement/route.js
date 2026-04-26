import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import Message from "@/models/Message";
import { getRoomAccess } from "@/lib/roomRoles";
import { buildNotificationLink, createRoomNotifications } from "@/lib/notifications";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { roomId, message } = await req.json();

    if (!roomId || !message || !message.trim()) {
      return NextResponse.json(
        { error: "roomId and message are required" },
        { status: 400 }
      );
    }

    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.canManageRoom) {
      return NextResponse.json(
        { error: "Only admin or moderator can post announcements" },
        { status: 403 }
      );
    }

    const now = new Date();

    const created = await Message.create({
      roomId,
      senderId: access.user._id,
      senderName: access.user.name || access.user.email,
      message: message.trim(),
      type: "announcement",
      isPinned: false,
      pinnedAt: null,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    await Room.findByIdAndUpdate(roomId, { $set: { updatedAt: now } });

    await createRoomNotifications({
      room: access.room,
      sender: access.user,
      actionType: "announcement",
      entityType: "announcement",
      entityId: created._id,
      previewText: created.message,
      link: buildNotificationLink(roomId, "announcement"),
    });

    return NextResponse.json({ message: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
