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
  isMeaningfulTaskUpdate,
} from "@/lib/notifications";

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, taskId } = await params;
    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await connectDB();

    const task = await Task.findOne({ _id: taskId, roomId });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { status, assignedTo, title, description, dueDate, priority } = await req.json();

    const assigneeId = task.assignedTo ? task.assignedTo.toString() : null;
    const isAssignee = assigneeId === access.user._id.toString();
    const beforeTask = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assignedTo: task.assignedTo ? task.assignedTo.toString() : null,
    };

    const allowedPriorities = ["low", "med", "high"];
    const nextPriority = priority === undefined ? undefined : priority;
    const nextDueDate = dueDate === undefined ? undefined : (dueDate ? new Date(dueDate) : null);

    if (nextPriority !== undefined && !allowedPriorities.includes(nextPriority)) {
      return NextResponse.json({ error: "Invalid task priority" }, { status: 400 });
    }

    if (nextDueDate instanceof Date && Number.isNaN(nextDueDate.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    if (status) {
      const validStatuses = ["todo", "inprogress", "done"];

      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid task status" }, { status: 400 });
      }

      // Only assigned user can progress a task to done.
      if (status === "done" && (!assigneeId || !isAssignee)) {
        return NextResponse.json(
          { error: "Only the assigned member can move this task to done" },
          { status: 403 }
        );
      }

      // Only owner or assigned user can mark in-progress.
      if (status === "inprogress" && !access.canManageRoom && !isAssignee) {
        return NextResponse.json(
          { error: "Only owner or assignee can move task to in progress" },
          { status: 403 }
        );
      }

      // Resetting task back to todo is owner-only.
      if (status === "todo" && !access.canManageRoom) {
        return NextResponse.json(
          { error: "Only the room owner can move task back to todo" },
          { status: 403 }
        );
      }
    }

    if ((assignedTo !== undefined || typeof title === "string" || typeof description === "string" || dueDate !== undefined || priority !== undefined) && !access.canManageRoom) {
      return NextResponse.json(
        { error: "Only the room owner can edit task details or assignment" },
        { status: 403 }
      );
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

    if (status) task.status = status;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (typeof title === "string") task.title = title.trim();
    if (typeof description === "string") task.description = description.trim();
    if (nextDueDate !== undefined) task.dueDate = nextDueDate;
    if (nextPriority !== undefined) task.priority = nextPriority;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .lean();

    const afterTask = {
      title: updatedTask.title,
      description: updatedTask.description,
      status: updatedTask.status,
      priority: updatedTask.priority,
      dueDate: updatedTask.dueDate,
      assignedTo: updatedTask.assignedTo?._id
        ? updatedTask.assignedTo._id.toString()
        : updatedTask.assignedTo
          ? updatedTask.assignedTo.toString()
          : null,
    };

    if (isMeaningfulTaskUpdate(beforeTask, afterTask)) {
      await createRoomNotifications({
        room: access.room,
        sender: access.user,
        actionType: "task",
        entityType: "task",
        entityId: task._id,
        previewText: buildTaskNotificationPreview(beforeTask, afterTask),
        link: buildNotificationLink(roomId, "task"),
      });
    }

    return NextResponse.json({ task: updatedTask }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, taskId } = await params;
    const access = await getRoomAccess(session, roomId);

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.canManageRoom) {
      return NextResponse.json(
        { error: "Only the room owner can delete tasks" },
        { status: 403 }
      );
    }

    const deleted = await Task.findOneAndDelete({ _id: taskId, roomId });

    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
