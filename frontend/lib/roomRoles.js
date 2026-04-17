import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import User from "@/models/User";
import Room from "@/models/Room";

export const ROOM_ROLE = {
  ADMIN: "admin",
  MODERATOR: "moderator",
  MEMBER: "member",
};

function isValidRole(role) {
  return role === ROOM_ROLE.ADMIN || role === ROOM_ROLE.MODERATOR || role === ROOM_ROLE.MEMBER;
}

function toObjectId(value) {
  if (!value) return null;

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (Buffer.isBuffer(value) && value.length === 12) {
    return new mongoose.Types.ObjectId(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      return new mongoose.Types.ObjectId(trimmed);
    }

    const objectIdMatch = trimmed.match(/ObjectId\(['\"]?([a-fA-F0-9]{24})['\"]?\)/);
    if (objectIdMatch?.[1]) {
      return new mongoose.Types.ObjectId(objectIdMatch[1]);
    }

    return null;
  }

  if (value?.userId) {
    return toObjectId(value.userId);
  }

  if (value?._id) {
    return toObjectId(value._id);
  }

  if (value?.id) {
    return toObjectId(value.id);
  }

  if (value?.buffer && Buffer.isBuffer(value.buffer) && value.buffer.length === 12) {
    return new mongoose.Types.ObjectId(value.buffer);
  }

  if (typeof value?.toString === "function") {
    const serialized = value.toString();
    if (mongoose.Types.ObjectId.isValid(serialized)) {
      return new mongoose.Types.ObjectId(serialized);
    }
  }

  return null;
}

function toNormalizedMember(member, room) {
  if (!member) return null;

  const fallbackJoinedAt = room?.createdAt || new Date();
  const fallbackLastSeen = member?.joinedAt || room?.createdAt || new Date();
  const createdById = toObjectId(room?.createdBy);

  const userId = toObjectId(member?.userId || member);
  if (!userId) return null;

  const defaultRole =
    createdById && userId.toString() === createdById.toString()
      ? ROOM_ROLE.ADMIN
      : ROOM_ROLE.MEMBER;
  const role = isValidRole(member?.role) ? member.role : defaultRole;
  const joinedAt = member?.joinedAt || fallbackJoinedAt;
  const lastSeen = member?.lastSeen || fallbackLastSeen;

  return {
    userId,
    role,
    joinedAt,
    lastSeen,
  };
}

function memberUserIdString(member) {
  if (!member) return "";
  const userId = toObjectId(member?.userId || member);
  return userId ? userId.toString() : "";
}

function hasStructuredMembersSchema(room) {
  return Boolean(room?.schema?.path("members.userId"));
}

function getRoomMembers(room) {
  if (Array.isArray(room?.$locals?.normalizedMembers)) {
    return room.$locals.normalizedMembers;
  }

  return Array.isArray(room?.members) ? room.members : [];
}

export async function getUserFromSession(session) {
  if (!session?.user?.email) return null;

  return User.findOne({ email: session.user.email.toLowerCase().trim() });
}

export async function normalizeLegacyRoomMembers(room) {
  if (!room?.members?.length) return;

  let changed = false;
  const normalizedMembers = [];

  for (const member of room.members) {
    const normalized = toNormalizedMember(member, room);
    if (!normalized) continue;

    normalizedMembers.push(normalized);

    if (!member?.userId) {
      changed = true;
      continue;
    }

    if (
      member.role !== normalized.role
      || String(member.joinedAt || "") !== String(normalized.joinedAt || "")
      || String(member.lastSeen || "") !== String(normalized.lastSeen || "")
    ) {
      changed = true;
    }
  }

  room.$locals = room.$locals || {};
  room.$locals.normalizedMembers = normalizedMembers;

  if (changed && hasStructuredMembersSchema(room)) {
    room.members = normalizedMembers;
    await room.save();
  }

  return normalizedMembers;
}

export function getMemberEntry(room, userId) {
  const members = getRoomMembers(room);
  if (!members.length || !userId) return null;

  const targetUserId = userId.toString();

  for (const member of members) {
    const currentId = memberUserIdString(member);
    if (!currentId) continue;

    if (currentId === targetUserId) {
      if (member?.userId) return member;

      const createdById = toObjectId(room?.createdBy);
      const isAdmin = createdById ? currentId === createdById.toString() : false;
      return {
        userId: member,
        role: isAdmin ? ROOM_ROLE.ADMIN : ROOM_ROLE.MEMBER,
        joinedAt: room.createdAt || new Date(),
        lastSeen: room.createdAt || new Date(),
      };
    }
  }

  return null;
}

export function getUserRoleFromRoom(room, userId) {
  const memberEntry = getMemberEntry(room, userId);
  return memberEntry?.role || null;
}

export async function getUserRole(roomId, userId) {
  await connectDB();

  const room = await Room.findById(roomId);
  if (!room) return null;

  await normalizeLegacyRoomMembers(room);

  return getUserRoleFromRoom(room, userId);
}

export async function getRoomAccess(session, roomId) {
  await connectDB();

  const user = await getUserFromSession(session);

  if (!user) {
    return { error: "User not found", status: 404 };
  }

  const room = await Room.findById(roomId);

  if (!room) {
    return { error: "Room not found", status: 404 };
  }

  await normalizeLegacyRoomMembers(room);

  const memberEntry = getMemberEntry(room, user._id);

  if (!memberEntry) {
    return { error: "You are not a member of this room", status: 403 };
  }

  const role = memberEntry.role || ROOM_ROLE.MEMBER;
  const canManageRoom = role === ROOM_ROLE.ADMIN || role === ROOM_ROLE.MODERATOR;

  return {
    user,
    room,
    members: getRoomMembers(room),
    memberEntry,
    role,
    canManageRoom,
    isAdmin: role === ROOM_ROLE.ADMIN,
    isModerator: role === ROOM_ROLE.MODERATOR,
  };
}
