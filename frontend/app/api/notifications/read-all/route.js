import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getUserFromSession } from "@/lib/roomRoles";

export async function PATCH() {
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

    const now = new Date();

    await Notification.updateMany(
      { recipientId: user._id, readAt: null },
      { $set: { readAt: now } }
    );

    return NextResponse.json({ success: true, readAt: now.toISOString() }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
