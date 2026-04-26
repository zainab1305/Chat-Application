"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const STATUS_LABELS = {
  todo: "Todo",
  inprogress: "In Progress",
  done: "Done",
};

const STATUS_ORDER = ["todo", "inprogress", "done"];

const PRIORITY_LABELS = {
  low: "Low",
  med: "Medium",
  high: "High",
};

function createTaskForm(task = null, status = "todo") {
  const dueDateValue = task?.dueDate ? new Date(task.dueDate) : null;
  const normalizedDueDate = dueDateValue && !Number.isNaN(dueDateValue.getTime())
    ? dueDateValue.toISOString().slice(0, 10)
    : "";

  return {
    title: task?.title || "",
    description: task?.description || "",
    assignedTo: task?.assignedTo?._id || task?.assignedTo || "",
    dueDate: normalizedDueDate,
    priority: task?.priority || "med",
    status: task?.status || status,
  };
}

function formatDueDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString();
}

export default function TasksClient({ roomId }) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [canManageTasks, setCanManageTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [openMenuTaskId, setOpenMenuTaskId] = useState("");
  const [taskModal, setTaskModal] = useState({ open: false, mode: "create", taskId: "" });
  const [form, setForm] = useState(createTaskForm());

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

      const [tasksData, membersData] = await Promise.all([tasksRes.json(), membersRes.json()]);

      if (!tasksRes.ok) throw new Error(tasksData.error || "Failed to load tasks");
      if (!membersRes.ok) throw new Error(membersData.error || "Failed to load members");

      setTasks(Array.isArray(tasksData.tasks) ? tasksData.tasks : []);
      setMembers(Array.isArray(membersData.members) ? membersData.members : []);
      setCurrentUserId(tasksData.currentUserId || "");
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
    loadData();
  }, [roomId]);

  const groupedTasks = useMemo(
    () =>
      STATUS_ORDER.reduce((accumulator, status) => {
        accumulator[status] = tasks.filter((task) => task.status === status);
        return accumulator;
      }, {}),
    [tasks]
  );

  const getMemberLabel = (memberValue) => {
    if (!memberValue) return "Unassigned";

    const memberId = memberValue?._id || memberValue;
    const matched = members.find((member) => String(member.id) === String(memberId));
    return matched ? matched.name : "Unassigned";
  };

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

  const openCreateModal = (status = "todo") => {
    setForm(createTaskForm(null, status));
    setTaskModal({ open: true, mode: "create", taskId: "" });
    setOpenMenuTaskId("");
  };

  const openEditModal = (task) => {
    setForm(createTaskForm(task, task?.status || "todo"));
    setTaskModal({ open: true, mode: "edit", taskId: task._id });
    setOpenMenuTaskId("");
  };

  const closeTaskModal = () => {
    setTaskModal({ open: false, mode: "create", taskId: "" });
    setForm(createTaskForm());
  };

  const updateTask = async (taskId, payload, silent = false) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update task");

      setTasks((current) => current.map((task) => (task._id === taskId ? data.task : task)));
      return data.task;
    } catch (err) {
      if (!silent) {
        setError(err.message || "Failed to update task");
      }
      return null;
    }
  };

  const saveTask = async (event) => {
    event.preventDefault();

    if (!canManageTasks) {
      setError("Only room managers can create or edit tasks");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title,
        description: form.description,
        assignedTo: form.assignedTo || null,
        dueDate: form.dueDate || null,
        priority: form.priority,
        status: form.status,
      };

      if (taskModal.mode === "create") {
        const response = await fetch(`/api/rooms/${roomId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create task");

        const createdTask = data.task;
        setTasks((current) => [createdTask, ...current]);
      } else {
        const response = await fetch(`/api/rooms/${roomId}/tasks/${taskModal.taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update task");

        setTasks((current) => current.map((task) => (task._id === taskModal.taskId ? data.task : task)));
      }

      closeTaskModal();
    } catch (err) {
      setError(err.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!canManageTasks) return;

    setError("");

    try {
      const response = await fetch(`/api/rooms/${roomId}/tasks/${taskId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to delete task");

      setTasks((current) => current.filter((task) => task._id !== taskId));
    } catch (err) {
      setError(err.message || "Failed to delete task");
    }
  };

  if (loading) return <p>Loading tasks...</p>;

  return (
    <div className="workspace-section trello-board-shell">
      {error ? <p className="error-banner">{error}</p> : null}

      <div className="trello-board-toolbar">
        <div>
          <p className="dashboard-kicker">Tasks</p>
          <h2>Room task board</h2>
          <p>Move work from todo to done and keep the room organized.</p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => openCreateModal("todo")}
          disabled={!canManageTasks}
        >
          Add Task
        </button>
      </div>

      <div className="trello-board-grid">
        {STATUS_ORDER.map((status) => (
          <section key={status} className="trello-column">
            <div className="trello-column-head">
              <div>
                <h3>{STATUS_LABELS[status]}</h3>
                <p>{groupedTasks[status].length} tasks</p>
              </div>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => openCreateModal(status)}
                disabled={!canManageTasks}
              >
                Add Task
              </button>
            </div>

            <div className="trello-column-list">
              {groupedTasks[status].length === 0 ? (
                <p className="message-empty">No tasks in this column.</p>
              ) : (
                groupedTasks[status].map((task) => {
                  const canStart = canProgressTask(task, "inprogress");
                  const canDone = canProgressTask(task, "done");
                  const canReset = canProgressTask(task, "todo");
                  const dueLabel = formatDueDate(task.dueDate);
                  const isMenuOpen = openMenuTaskId === task._id;

                  return (
                    <article key={task._id} className="trello-task-card" onClick={() => setOpenMenuTaskId("")}>
                      <div className="trello-task-head">
                        <div className="trello-task-title-row">
                          <span className={`task-status-dot ${task.status}`} aria-hidden="true" />
                          <h4>{task.title}</h4>
                        </div>

                        <div className="trello-task-actions">
                          <button
                            type="button"
                            className="ghost-btn task-menu-toggle"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuTaskId((current) => (current === task._id ? "" : task._id));
                            }}
                            aria-label="Task menu"
                          >
                            ⋯
                          </button>

                          {isMenuOpen ? (
                            <div className="task-menu" onClick={(event) => event.stopPropagation()}>
                              {canManageTasks ? (
                                <button type="button" onClick={() => openEditModal(task)}>
                                  Edit
                                </button>
                              ) : null}
                              {canManageTasks ? (
                                <button type="button" onClick={() => deleteTask(task._id)}>
                                  Delete
                                </button>
                              ) : null}
                              {status !== "todo" && canReset ? (
                                <button type="button" onClick={() => updateTask(task._id, { status: "todo" })}>
                                  Move to Todo
                                </button>
                              ) : null}
                              {status !== "inprogress" && canStart ? (
                                <button type="button" onClick={() => updateTask(task._id, { status: "inprogress" })}>
                                  Move to In Progress
                                </button>
                              ) : null}
                              {status !== "done" && canDone ? (
                                <button type="button" onClick={() => updateTask(task._id, { status: "done" })}>
                                  Move to Done
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {task.description ? <p className="trello-task-description">{task.description}</p> : null}

                      <div className="task-badge-row">
                        <span className="task-badge assignee">{getMemberLabel(task.assignedTo)}</span>
                        <span className={`task-badge priority ${task.priority || "med"}`}>
                          {PRIORITY_LABELS[task.priority || "med"]}
                        </span>
                        {dueLabel ? <span className="task-badge due-date">Due {dueLabel}</span> : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>

      {taskModal.open ? (
        <div className="task-modal-backdrop" onClick={closeTaskModal}>
          <div className="task-modal" onClick={(event) => event.stopPropagation()}>
            <div className="task-modal-head">
              <div>
                <p className="dashboard-kicker">{taskModal.mode === "create" ? "Create Task" : "Edit Task"}</p>
                <h3>{taskModal.mode === "create" ? "New task card" : "Update task card"}</h3>
              </div>

              <button type="button" className="ghost-btn" onClick={closeTaskModal}>
                Close
              </button>
            </div>

            <form className="task-modal-form" onSubmit={saveTask}>
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Task title"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Task details"
                  rows={4}
                />
              </label>

              <label>
                Assign member
                <select
                  value={form.assignedTo}
                  onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
                >
                  <option value="">Not assigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="task-modal-grid">
                <label>
                  Due date
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                  />
                </label>

                <label>
                  Priority
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="med">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="todo">Todo</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>
              </div>

              <div className="task-modal-actions">
                <button type="button" className="ghost-btn" onClick={closeTaskModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? "Saving..." : taskModal.mode === "create" ? "Create Task" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}