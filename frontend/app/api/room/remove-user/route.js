import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Room from "@/models/Room";
import { getRoomAccess } from "@/lib/roomRoles";

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, targetUserId } = await req.json();

    if (!roomId || !targetUserId) {
      return NextResponse.json(
        { error: "roomId and targetUserId are required" },
        { status: 400 }
      );
    }

    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.canManageRoom) {
      return NextResponse.json(
        { error: "Only room managers can remove users" },
        { status: 403 }
      );
    }

    if (access.user._id.toString() === targetUserId) {
      return NextResponse.json(
        { error: "Admin cannot remove self" },
        { status: 400 }
      );
    }

    const targetIndex = access.members.findIndex(
      (member) => member?.userId?.toString?.() === targetUserId
    );

    if (targetIndex < 0) {
      return NextResponse.json({ error: "Target user not in room" }, { status: 404 });
    }

    const targetMember = access.members[targetIndex];

    if (targetMember.role === "admin") {
      return NextResponse.json(
        { error: "Cannot remove room admin" },
        { status: 400 }
      );
    }

    if (access.role === "moderator" && targetMember.role !== "member") {
      return NextResponse.json(
        { error: "Moderators can only remove members" },
        { status: 403 }
      );
    }

    const targetObjectId = new mongoose.Types.ObjectId(targetUserId);

    await Room.updateOne(
      { _id: access.room._id },
      { $pull: { members: { userId: targetObjectId } } }
    );

    return NextResponse.json(
      { message: "User removed", roomId, targetUserId },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}