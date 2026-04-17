import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Room from "@/models/Room";
import { getRoomAccess } from "@/lib/roomRoles";

export async function DELETE(_, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { roomId, messageId } = await params;
    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.canManageRoom) {
      return NextResponse.json(
        { error: "Only admin or moderator can delete messages" },
        { status: 403 }
      );
    }

    const deleted = await Message.findOneAndDelete({ _id: messageId, roomId });

    if (!deleted) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const now = new Date();
    await Room.findByIdAndUpdate(roomId, { $set: { updatedAt: now } });

    return NextResponse.json(
      {
        messageId,
        roomId,
        deletedPinned: Boolean(deleted.isPinned),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}