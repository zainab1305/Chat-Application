import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Message from "@/models/Message";
import { getRoomAccess } from "@/lib/roomRoles";

export async function DELETE(_, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;
    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.isAdmin) {
      return NextResponse.json(
        { error: "Only room admin can delete this room" },
        { status: 403 }
      );
    }

    await Message.deleteMany({ roomId });
    await Room.findByIdAndDelete(roomId);

    return NextResponse.json({ message: "Room deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}