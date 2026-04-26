import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getUserFromSession } from "@/lib/roomRoles";
import { serializeNotificationList } from "@/lib/notifications";

export async function PATCH(_, { params }) {
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

    const { notificationId } = await params;
    const now = new Date();

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: user._id },
      { $set: { readAt: now } },
      { new: true }
    ).lean();

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json(
      { notification: serializeNotificationList([notification])[0] },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
