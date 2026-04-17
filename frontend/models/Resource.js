import mongoose from "mongoose";

const ResourceSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["file", "link"],
      required: true,
    },
    url: { type: String, required: true },
    name: { type: String, default: "", trim: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);