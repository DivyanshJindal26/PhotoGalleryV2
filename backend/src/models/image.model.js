import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "fs.files",
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploader: {
    type: String,
    required: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
  event: {
    type: String,
  },
  approval: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  uploaderEmail: {
    type: String,
    required: true,
  },
  likedBy: {
    type: [String],
    default: [],
  },
  contentType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
});

const fileModel = mongoose.model("Image", imageSchema);

export default fileModel;
