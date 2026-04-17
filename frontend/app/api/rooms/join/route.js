import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Room from "@/models/Room";
import { ROOM_ROLE, normalizeLegacyRoomMembers } from "@/lib/roomRoles";

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_REGEX = new RegExp(`^[A-Z0-9]{${ROOM_CODE_LENGTH}}$`);

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    const normalizedCode = (code || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, ROOM_CODE_LENGTH);

    if (!normalizedCode) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    if (!ROOM_CODE_REGEX.test(normalizedCode)) {
      return NextResponse.json(
        { error: `Room code must be exactly ${ROOM_CODE_LENGTH} letters/numbers` },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({
      email: session.user.email.toLowerCase().trim(),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const room = await Room.findOne({ code: normalizedCode });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await normalizeLegacyRoomMembers(room);

    const alreadyMember = room.members.some(
      (member) => member?.userId?.toString?.() === user._id.toString()
    );

    if (!alreadyMember) {
      room.members.push({
        userId: user._id,
        role: ROOM_ROLE.MEMBER,
        joinedAt: new Date(),
        lastSeen: new Date(),
      });
      await room.save();
    } else {
      await Room.updateOne(
        { _id: room._id, "members.userId": user._id },
        { $set: { "members.$.lastSeen": new Date() } }
      );
    }

    return NextResponse.json({ room }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
