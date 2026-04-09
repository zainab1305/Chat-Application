import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Room from "@/models/Room";
import Message from "@/models/Message";

async function getUserAndRoom(session, roomId) {
  const user = await User.findOne({
    email: session.user.email.toLowerCase().trim(),
  });

  if (!user) {
    return { error: "User not found", status: 404 };
  }

  const room = await Room.findById(roomId);

  if (!room) {
    return { error: "Room not found", status: 404 };
  }

  const isMember = room.members.some(
    (memberId) => memberId.toString() === user._id.toString()
  );

  if (!isMember) {
    return { error: "You are not a member of this room", status: 403 };
  }

  return { user, room };
}

export async function GET(_, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { roomId } = await params;
    const access = await getUserAndRoom(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .select("senderId senderName message time createdAt")
      .lean();

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await connectDB();

    const { roomId } = await params;
    const access = await getUserAndRoom(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const now = new Date();

    const created = await Message.create({
      roomId,
      senderId: access.user._id,
      senderName: access.user.name || access.user.email,
      message: message.trim(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    await Room.findByIdAndUpdate(roomId, { $set: { updatedAt: now } });

    return NextResponse.json({ message: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
