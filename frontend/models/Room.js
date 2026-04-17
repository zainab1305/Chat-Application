import mongoose from "mongoose";

const RoomMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "moderator", "member"],
      default: "member",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      RoomMemberSchema,
    ],
  },
  { timestamps: true }
);

const existingRoomModel = mongoose.models.Room;

if (existingRoomModel) {
  const hasStructuredMembers = Boolean(existingRoomModel.schema.path("members.userId"));

  // During hot reload, keep schema in sync after migrating members from ObjectId[] to subdocuments.
  if (!hasStructuredMembers) {
    delete mongoose.models.Room;
  }
}

const Room = mongoose.models.Room || mongoose.model("Room", RoomSchema);

export default Room;
