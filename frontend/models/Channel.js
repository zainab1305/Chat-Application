import mongoose from "mongoose";

const ChannelSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index: fast lookup of channels in a workspace
ChannelSchema.index({ workspaceId: 1, createdAt: 1 });

export default mongoose.models.Channel || mongoose.model("Channel", ChannelSchema);
