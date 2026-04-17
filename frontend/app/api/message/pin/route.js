import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import Message from "@/models/Message";
import { getRoomAccess } from "@/lib/roomRoles";

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { roomId, messageId } = await req.json();

    if (!roomId || !messageId) {
      return NextResponse.json(
        { error: "roomId and messageId are required" },
        { status: 400 }
      );
    }

    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.canManageRoom) {
      return NextResponse.json(
        { error: "Only admin or moderator can pin messages" },
        { status: 403 }
      );
    }

    const message = await Message.findOne({ _id: messageId, roomId });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const nextPinnedState = !message.isPinned;
    const now = new Date();

    message.isPinned = nextPinnedState;
    message.pinnedAt = nextPinnedState ? now : null;
    await message.save();

    await Room.findByIdAndUpdate(roomId, { $set: { updatedAt: now } });

    return NextResponse.json(
      {
        message: {
          _id: message._id,
          roomId: message.roomId,
          senderId: message.senderId,
          senderName: message.senderName,
          message: message.message,
          type: message.type,
          isPinned: message.isPinned,
          pinnedAt: message.pinnedAt,
          time: message.time,
          createdAt: message.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}