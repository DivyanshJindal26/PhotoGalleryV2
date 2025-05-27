import express from "express";
import { userLogin, isAdmin, getMe } from "../controllers/auth.js";

const router = express.Router();

router.post("/login", userLogin);
router.post("/isAdmin", isAdmin);
router.get("/me", getMe);

export default router;
