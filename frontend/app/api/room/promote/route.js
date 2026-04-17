import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Room from "@/models/Room";
import { getRoomAccess, ROOM_ROLE } from "@/lib/roomRoles";

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, targetUserId, role: targetRole } = await req.json();

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

    if (!access.isAdmin) {
      return NextResponse.json(
        { error: "Only admin can update member roles" },
        { status: 403 }
      );
    }

    const targetMember = access.members.find(
      (member) => member?.userId?.toString?.() === targetUserId
    );

    if (!targetMember) {
      return NextResponse.json({ error: "Target user not in room" }, { status: 404 });
    }

    if (targetMember.role === ROOM_ROLE.ADMIN) {
      return NextResponse.json(
        { error: "Cannot promote room admin" },
        { status: 400 }
      );
    }

    if (targetMember.role === ROOM_ROLE.MODERATOR && targetRole === ROOM_ROLE.MODERATOR) {
      return NextResponse.json(
        { error: "Member is already a moderator" },
        { status: 400 }
      );
    }

    if (targetRole && ![ROOM_ROLE.MODERATOR, ROOM_ROLE.MEMBER].includes(targetRole)) {
      return NextResponse.json(
        { error: "Invalid target role" },
        { status: 400 }
      );
    }

    const nextRole = targetRole || ROOM_ROLE.MODERATOR;

    await Room.updateOne(
      { _id: access.room._id, "members.userId": new mongoose.Types.ObjectId(targetUserId) },
      { $set: { "members.$.role": nextRole } }
    );

    return NextResponse.json(
      { message: "Role updated", roomId, targetUserId, role: nextRole },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}