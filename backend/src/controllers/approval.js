import fileModel from "../models/image.model.js";
import { getGridFSBucket } from "../helpers/mongoose.js";
import mongoose from "mongoose";

// 1. Approve a photo by MongoDB _id
export const approvePost = async (req, res) => {
  try {
    console.log("Approving photo...");
    const { id } = req.params;

    const photo = await fileModel.findOne({ fileId: id });
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    photo.approval = true;
    const updatedPhoto = await photo.save();

    res.status(200).json({
      message: "Photo approved successfully",
      photo: updatedPhoto,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error approving photo",
      error: err.message,
    });
  }
};

// 2. Disapprove a photo by MongoDB _id
export const disapprovePost = async (req, res) => {
  try {
    const { id } = req.params;

    const photo = await fileModel.findOne({ fileId: id });
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    photo.approval = false;
    const updatedPhoto = await photo.save();

    res.status(200).json({
      message: "Photo disapproved successfully",
      photo: updatedPhoto,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error disapproving photo",
      error: err.message,
    });
  }
};

export const delApprovePost = async (req, res) => {
  try {
    const { id } = req.params;
    const photo = await fileModel.findOne({ fileId: id });

    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    const gfs = getGridFSBucket();

    // photo.fileId is expected to be an ObjectId or a string ObjectId
    const fileObjId =
      typeof photo.fileId === "string"
        ? new Types.ObjectId(photo.fileId)
        : photo.fileId;

    // Delete file from GridFS
    await gfs.delete(fileObjId);

    // Delete metadata document
    await fileModel.findOneAndDelete({ fileId: id });

    return res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    return res.status(500).json({
      message: "Error deleting photo",
      error: err.message,
    });
  }
};

// 4. Get all unapproved photos (approval === false)
export const getApproved = async (req, res) => {
  try {
    const unapproved = await fileModel
      .find({ approval: false })
      .sort({ uploadedAt: -1 });

    res.status(200).json(unapproved);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching unapproved photos",
      error: err.message,
    });
  }
};
