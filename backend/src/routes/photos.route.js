import express from "express";
import {
  uploadImages,
  likePhoto,
  getLikes,
  downloadPhoto,
  imageFilters,
  viewImage,
} from "../controllers/photo.js";

const router = express.Router();

router.get("/", imageFilters);
router.post("/upload", uploadImages);
router.post("/:id/like", likePhoto);
router.get("/:id/likes", getLikes);
router.get("/:id/download", downloadPhoto);
router.get("/:id/view", viewImage);

export default router;
