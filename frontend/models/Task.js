import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    dueDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "med", "high"],
      default: "med",
    },
    status: {
      type: String,
      enum: ["todo", "inprogress", "done"],
      default: "todo",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Task || mongoose.model("Task", TaskSchema);