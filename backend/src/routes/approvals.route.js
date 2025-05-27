import express from "express";
import {
  approvePost,
  disapprovePost,
  delApprovePost,
  getApproved,
} from "../controllers/approval.js";
import { isAdmin } from "../middleware/isAdmin.js";

const router = express.Router();

router.post("/:id", isAdmin, approvePost);
router.post("/:id/disapprove", isAdmin, disapprovePost);
router.delete("/:id", isAdmin, delApprovePost);
router.get("/", getApproved);

export default router;
