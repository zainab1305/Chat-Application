import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";
import { getRoomAccess } from "@/lib/roomRoles";
import {
  buildNotificationLink,
  buildTaskNotificationPreview,
  createRoomNotifications,
} from "@/lib/notifications";

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

    const tasks = await Task.find({ roomId })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json(
      {
        tasks,
        currentUserId: access.user._id.toString(),
        canManageTasks: access.canManageRoom,
      },
      { status: 200 }
    );
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

    await connectDB();

    const { roomId } = await params;
    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.canManageRoom) {
      return NextResponse.json(
        { error: "Only room managers can create tasks" },
        { status: 403 }
      );
    }

    const { title, description, assignedTo, dueDate, priority, status } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    if (assignedTo) {
      const isAssigneeInRoom = access.members.some(
        (member) => member?.userId?.toString?.() === assignedTo
      );

      if (!isAssigneeInRoom) {
        return NextResponse.json(
          { error: "Assigned user must be a room member" },
          { status: 400 }
        );
      }
    }

    const allowedPriorities = ["low", "med", "high"];
    const nextPriority = priority === undefined ? "med" : priority;
    const nextDueDate = dueDate ? new Date(dueDate) : null;
    const allowedStatuses = ["todo", "inprogress", "done"];
    const nextStatus = status === undefined ? "todo" : status;

    if (!allowedPriorities.includes(nextPriority)) {
      return NextResponse.json({ error: "Invalid task priority" }, { status: 400 });
    }

    if (!allowedStatuses.includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid task status" }, { status: 400 });
    }

    if (nextDueDate && Number.isNaN(nextDueDate.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    const task = await Task.create({
      roomId,
      title: title.trim(),
      description: description?.trim() || "",
      dueDate: nextDueDate,
      priority: nextPriority,
      assignedTo: assignedTo || null,
      createdBy: access.user._id,
      status: nextStatus,
    });

    const createdTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .lean();

    await createRoomNotifications({
      room: access.room,
      sender: access.user,
      actionType: "task",
      entityType: "task",
      entityId: task._id,
      previewText: buildTaskNotificationPreview(null, createdTask),
      link: buildNotificationLink(roomId, "task"),
    });

    return NextResponse.json({ task: createdTask }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
