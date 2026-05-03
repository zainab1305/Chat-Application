import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Channel from "@/models/Channel";
import { getRoomAccess } from "@/lib/roomRoles";

/**
 * GET /api/rooms/[roomId]/channels
 * Returns all channels for a workspace.
 * If none exist, auto-creates a default "general" channel.
 */
export async function GET(_, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;

    await connectDB();

    const access = await getRoomAccess(session, roomId);
    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let channels = await Channel.find({ workspaceId: roomId })
      .sort({ createdAt: 1 })
      .lean();

    // Auto-create default "general" channel if workspace has none
    if (channels.length === 0) {
      const defaultChannel = await Channel.create({
        workspaceId: roomId,
        name: "general",
        createdBy: access.user._id,
      });
      channels = [defaultChannel.toObject ? defaultChannel.toObject() : defaultChannel];
    }

    const serialized = channels.map((ch) => ({
      _id: ch._id.toString(),
      name: ch.name,
      workspaceId: ch.workspaceId.toString(),
      createdBy: ch.createdBy ? ch.createdBy.toString() : null,
      createdAt: ch.createdAt,
    }));

    return NextResponse.json({ channels: serialized }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/rooms/[roomId]/channels
 * Creates a new channel. Only admin (workspace creator) can do this.
 */
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;

    await connectDB();

    const access = await getRoomAccess(session, roomId);
    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.isAdmin) {
      return NextResponse.json(
        { error: "Only the workspace owner can create channels" },
        { status: 403 }
      );
    }

    const { name } = await req.json();

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    const channelName = String(name)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 40);

    if (!channelName) {
      return NextResponse.json({ error: "Invalid channel name" }, { status: 400 });
    }

    const channel = await Channel.create({
      workspaceId: roomId,
      name: channelName,
      createdBy: access.user._id,
    });

    return NextResponse.json(
      {
        channel: {
          _id: channel._id.toString(),
          name: channel.name,
          workspaceId: channel.workspaceId.toString(),
          createdBy: channel.createdBy.toString(),
          createdAt: channel.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
