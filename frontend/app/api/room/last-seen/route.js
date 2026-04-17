import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getRoomAccess } from "@/lib/roomRoles";

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }

    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const now = new Date();

    const targetUserId = access.user._id.toString();
    let updated = false;

    for (let index = 0; index < access.room.members.length; index += 1) {
      const member = access.room.members[index];
      const memberUserId = (member?.userId || member)?.toString?.();

      if (!memberUserId || memberUserId !== targetUserId) continue;

      if (member?.userId) {
        access.room.members[index].lastSeen = now;
      } else {
        access.room.members[index] = {
          userId: access.user._id,
          role: access.memberEntry?.role || "member",
          joinedAt: access.memberEntry?.joinedAt || access.room.createdAt || now,
          lastSeen: now,
        };
      }

      updated = true;
      break;
    }

    if (!updated) {
      access.room.members.push({
        userId: access.user._id,
        role: access.memberEntry?.role || "member",
        joinedAt: access.memberEntry?.joinedAt || access.room.createdAt || now,
        lastSeen: now,
      });
    }

    access.room.updatedAt = now;
    await access.room.save();

    return NextResponse.json(
      { roomId, lastSeen: now.toISOString() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
