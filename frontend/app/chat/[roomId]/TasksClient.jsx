"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const STATUS_LABELS = {
  todo: "Todo",
  inprogress: "In Progress",
  done: "Done",
};

const STATUS_ORDER = ["todo", "inprogress", "done"];

export default function TasksClient({ roomId }) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [canManageTasks, setCanManageTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "" });

  async function loadData(silent = false) {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const [tasksRes, membersRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}/tasks`, { cache: "no-store" }),
        fetch(`/api/rooms/${roomId}/members`, { cache: "no-store" }),
      ]);

      const tasksData = await tasksRes.json();
      const membersData = await membersRes.json();

      if (!tasksRes.ok) throw new Error(tasksData.error || "Failed to load tasks");
      if (!membersRes.ok) throw new Error(membersData.error || "Failed to load members");

      setTasks(tasksData.tasks || []);
      setMembers(membersData.members || []);
      setCurrentUserId(tasksData.currentUserId || session?.user?.id || "");
      setCanManageTasks(Boolean(tasksData.canManageTasks));
    } catch (err) {
      if (!silent) {
        setError(err.message || "Unable to load tasks");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadData(false);

    const intervalId = setInterval(() => {
      loadData(true);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [roomId, session?.user?.id]);

  const groupedTasks = useMemo(
    () =>
      STATUS_ORDER.reduce((accumulator, status) => {
        accumulator[status] = tasks.filter((task) => task.status === status);
        return accumulator;
      }, {}),
    [tasks]
  );

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    if (!canManageTasks) {
      setError("Only room managers can create tasks");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch(`/api/rooms/${roomId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          assignedTo: form.assignedTo || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to create task");

      setTasks((prev) => [data.task, ...prev]);
      setForm({ title: "", description: "", assignedTo: "" });
    } catch (err) {
      setError(err.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const updateTask = async (taskId, payload) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update task");

      setTasks((prev) => prev.map((task) => (task._id === taskId ? data.task : task)));
    } catch (err) {
      setError(err.message || "Failed to update task");
    }
  };

  const deleteTask = async (taskId) => {
    if (!canManageTasks) {
      setError("Only room managers can delete tasks");
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/tasks/${taskId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete task");

      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    } catch (err) {
      setError(err.message || "Failed to delete task");
    }
  };

  const getMemberLabel = (memberId) => {
    if (!memberId) return "Unassigned";
    const matched = members.find((member) => member.id === (memberId._id || memberId));
    return matched ? matched.name : "Unassigned";
  };

  if (loading) return <p>Loading tasks...</p>;

  const canProgressTask = (task, nextStatus) => {
    const assigneeId = task?.assignedTo?._id || task?.assignedTo || "";

    if (nextStatus === "inprogress") {
      if (!assigneeId) return canManageTasks;
      return currentUserId === assigneeId || canManageTasks;
    }

    if (nextStatus === "done") {
      return Boolean(assigneeId) && currentUserId === assigneeId;
    }

    if (nextStatus === "todo") {
      return canManageTasks;
    }

    return false;
  };

  return (
    <div className="workspace-section">
      {error && <p className="error-banner">{error}</p>}

      {canManageTasks && (
        <form className="workspace-form" onSubmit={handleCreate}>
          <div className="workspace-form-head">
            <h2>Create Task</h2>
          </div>

          <div className="workspace-form-grid">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Task title"
              required
            />
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Task description"
            />
            <select
              value={form.assignedTo}
              onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
            >
              <option value="">Not assigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <button className="primary-btn" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      )}

      <div className="workspace-grid">
        {STATUS_ORDER.map((status) => (
          <section key={status} className="workspace-column">
            <h2>{STATUS_LABELS[status]}</h2>
            <div className="workspace-list">
              {groupedTasks[status].length === 0 ? (
                <p className="message-empty">No tasks.</p>
              ) : (
                groupedTasks[status].map((task) => {
                  const assigneeId = task?.assignedTo?._id || task?.assignedTo || "";
                  const canStart = canProgressTask(task, "inprogress");
                  const canDone = canProgressTask(task, "done");
                  const canReset = canProgressTask(task, "todo");

                  return (
                    <article key={task._id} className="workspace-card">
                      <h3>{task.title}</h3>
                      {task.description && <p>{task.description}</p>}
                      <p className="workspace-meta">Status: {STATUS_LABELS[task.status]}</p>
                      <p className="workspace-meta">Assigned: {getMemberLabel(task.assignedTo)}</p>

                      {canManageTasks && (
                        <div className="workspace-assignee-row">
                          <label htmlFor={`assign-${task._id}`}>Assign to</label>
                          <select
                            id={`assign-${task._id}`}
                            value={assigneeId}
                            onChange={(e) => updateTask(task._id, { assignedTo: e.target.value || null })}
                          >
                            <option value="">Not assigned</option>
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="workspace-actions">
                        <button
                          type="button"
                          className="ghost-btn"
                          disabled={task.status === "inprogress" || !canStart}
                          onClick={() => updateTask(task._id, { status: "inprogress" })}
                        >
                          Move to In Progress
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          disabled={task.status === "done" || !canDone}
                          onClick={() => updateTask(task._id, { status: "done" })}
                        >
                          Mark Done
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          disabled={task.status === "todo" || !canReset}
                          onClick={() => updateTask(task._id, { status: "todo" })}
                        >
                          Reset Todo
                        </button>
                        <button
                          type="button"
                          className="danger-btn"
                          disabled={!canManageTasks}
                          onClick={() => deleteTask(task._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}