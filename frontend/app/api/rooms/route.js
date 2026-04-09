import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Room from "@/models/Room";

function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

async function getUserFromSession(session) {
  if (!session?.user?.email) return null;

  return User.findOne({ email: session.user.email.toLowerCase().trim() });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await getUserFromSession(session);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const rooms = await Room.find({ members: user._id })
      .sort({ updatedAt: -1 })
      .select("name code createdBy members updatedAt createdAt")
      .lean();

    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await getUserFromSession(session);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let code = "";

    for (let i = 0; i < 10; i += 1) {
      const candidate = generateRoomCode();
      // Retry a few times in case generated code already exists.
      const existing = await Room.findOne({ code: candidate }).lean();
      if (!existing) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      return NextResponse.json(
        { error: "Unable to generate room code. Please retry." },
        { status: 500 }
      );
    }

    const room = await Room.create({
      name: name.trim(),
      code,
      createdBy: user._id,
      members: [user._id],
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
