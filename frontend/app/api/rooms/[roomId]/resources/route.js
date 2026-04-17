import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Resource from "@/models/Resource";
import { getRoomAccess } from "@/lib/roomRoles";

export async function GET(_, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;
    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const resources = await Resource.find({ roomId })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name email")
      .lean();

    return NextResponse.json({ resources }, { status: 200 });
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

    const { roomId } = await params;
    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { type, url, name } = await req.json();

    if (!type || !url) {
      return NextResponse.json({ error: "Resource type and url are required" }, { status: 400 });
    }

    const resource = await Resource.create({
      roomId,
      type,
      url,
      name: name?.trim() || "",
      uploadedBy: access.user._id,
    });

    const createdResource = await Resource.findById(resource._id)
      .populate("uploadedBy", "name email")
      .lean();

    return NextResponse.json({ resource: createdResource }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}