import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import User from "@/models/User";
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

    const memberRoleMap = new Map(
      access.members
        .filter((member) => Boolean(member?.userId?.toString?.()))
        .map((member) => [member.userId.toString(), member.role])
    );
    const memberIds = Array.from(memberRoleMap.keys());
    const members = await User.find({ _id: { $in: memberIds } })
      .select("name email image")
      .lean();

    const serializedMembers = members.map((member) => ({
      id: member._id.toString(),
      name: member.name || member.email,
      email: member.email,
      image: member.image || "",
      role: memberRoleMap.get(member._id.toString()) || "member",
    }));

    serializedMembers.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      {
        members: serializedMembers,
        currentUserRole: access.role,
        canManageMembers: access.canManageRoom,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}