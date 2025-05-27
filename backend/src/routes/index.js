import { Router } from "express";
import approvalRouter from "./approvals.route.js";
import authRouter from "./auth.route.js";
import photosRouter from "./photos.route.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/photos", photosRouter);
router.use("/approvals", approvalRouter);

export default router;
