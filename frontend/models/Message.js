import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      default: null,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: { type: String, required: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["message", "announcement"],
      default: "message",
      index: true,
    },
    isPinned: { type: Boolean, default: false, index: true },
    pinnedAt: { type: Date, default: null, index: true },
    replyTo: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },
      userId: {
        type: String,
        default: "",
      },
      senderName: { type: String, default: "" },
      message: { type: String, default: "" },
    },
    time: { type: String, required: true },
  },
  { timestamps: true }
);

// Supports unread count queries scoped by room and timestamp.
MessageSchema.index({ roomId: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);
