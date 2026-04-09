import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Room from "@/models/Room";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    const normalizedCode = code?.toUpperCase().trim();

    if (!normalizedCode) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
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

    const alreadyMember = room.members.some(
      (memberId) => memberId.toString() === user._id.toString()
    );

    if (!alreadyMember) {
      room.members.push(user._id);
      await room.save();
    }

    return NextResponse.json({ room }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
