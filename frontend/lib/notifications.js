import Notification from "@/models/Notification";
import { emitRealtimeNotifications, fetchActiveRoomUserIds } from "@/lib/notificationEvents";

function truncate(value, maxLength = 140) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
    : normalized;
}

function serializeNotification(doc) {
  const item = doc.toObject ? doc.toObject() : doc;

  return {
    _id: String(item._id),
    recipientId: String(item.recipientId),
    senderId: String(item.senderId),
    senderName: item.senderName,
    roomId: String(item.roomId),
    roomName: item.roomName,
    actionType: item.actionType,
    entityId: item.entityId ? String(item.entityId) : null,
    entityType: item.entityType,
    previewText: item.previewText,
    link: item.link,
    isRead: Boolean(item.readAt),
    readAt: item.readAt ? new Date(item.readAt).toISOString() : null,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function serializeNotificationList(items) {
  return (items || []).map(serializeNotification);
}

export async function createRoomNotifications({
  room,
  sender,
  actionType,
  entityType,
  entityId = null,
  previewText,
  link,
  skipUserIds = [],
}) {
  if (!room?._id || !sender?._id || !actionType || !entityType || !link) {
    return [];
  }

  const senderId = String(sender._id);
  const activeUserIds = new Set(await fetchActiveRoomUserIds(String(room._id)));
  const excluded = new Set([senderId, ...skipUserIds.map(String)]);

  const recipientIds = (room.members || [])
    .map((member) => String(member?.userId || member || ""))
    .filter(Boolean)
    .filter((memberId, index, list) => list.indexOf(memberId) === index)
    .filter((memberId) => !excluded.has(memberId))
    .filter((memberId) => !activeUserIds.has(memberId));

  if (recipientIds.length === 0) {
    return [];
  }

  const normalizedPreview = truncate(previewText, 180);
  if (!normalizedPreview) {
    return [];
  }

  const created = await Notification.insertMany(
    recipientIds.map((recipientId) => ({
      recipientId,
      senderId,
      senderName: sender.name || sender.email || "Someone",
      roomId: room._id,
      roomName: room.name || "Room",
      actionType,
      entityId,
      entityType,
      previewText: normalizedPreview,
      link,
    }))
  );

  const serialized = serializeNotificationList(created);
  await emitRealtimeNotifications(serialized);
  return serialized;
}

export function buildTaskNotificationPreview(beforeTask, afterTask) {
  if (!afterTask) return "";

  if (!beforeTask) {
    return `Created task: ${truncate(afterTask.title, 110)}`;
  }

  if (beforeTask.status !== afterTask.status) {
    return `Moved task "${truncate(afterTask.title, 80)}" to ${afterTask.status}`;
  }

  if (String(beforeTask.assignedTo || "") !== String(afterTask.assignedTo || "")) {
    return `Updated assignee for "${truncate(afterTask.title, 90)}"`;
  }

  if (beforeTask.dueDate?.toString() !== afterTask.dueDate?.toString()) {
    return `Updated due date for "${truncate(afterTask.title, 90)}"`;
  }

  if (beforeTask.priority !== afterTask.priority) {
    return `Changed priority for "${truncate(afterTask.title, 90)}"`;
  }

  if (beforeTask.title !== afterTask.title) {
    return `Renamed task to "${truncate(afterTask.title, 90)}"`;
  }

  if (beforeTask.description !== afterTask.description) {
    return `Updated task details for "${truncate(afterTask.title, 90)}"`;
  }

  return "";
}

export function isMeaningfulTaskUpdate(beforeTask, afterTask) {
  return Boolean(buildTaskNotificationPreview(beforeTask, afterTask));
}

export function buildNotificationLink(roomId, actionType) {
  if (actionType === "task") return `/chat/${roomId}/tasks`;
  if (actionType === "file") return `/chat/${roomId}/resources`;
  return `/chat/${roomId}/chat`;
}
