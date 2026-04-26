import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getUserFromSession } from "@/lib/roomRoles";
import { serializeNotificationList } from "@/lib/notifications";

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

    const notifications = await Notification.find({ recipientId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: user._id,
      readAt: null,
    });

    return NextResponse.json(
      {
        notifications: serializeNotificationList(notifications),
        unreadCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
