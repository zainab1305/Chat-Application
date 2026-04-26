import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    roomName: {
      type: String,
      required: true,
      trim: true,
    },
    actionType: {
      type: String,
      enum: ["message", "file", "task", "announcement"],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    entityType: {
      type: String,
      enum: ["message", "resource", "task", "announcement"],
      required: true,
    },
    previewText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });

export default mongoose.models.Notification
  || mongoose.model("Notification", NotificationSchema);
