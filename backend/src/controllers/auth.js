import admin from "firebase-admin";
import {
  isAdmin as checkAdmin,
  generateToken,
  verifyToken,
} from "../helpers/firebase.js";

export const userLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: "ID token is required" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    if (!email.endsWith("@students.iitmandi.ac.in")) {
      console.warn(`Blocked login attempt from unauthorized domain: ${email}`);
      return res
        .status(403)
        .json({ message: "Access denied: Unauthorized email domain" });
    }

    const token = generateToken({
      uid,
      email,
      name,
      picture,
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // Set to true if using HTTPS
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    console.log(`User logged in: ${email}`);
    return res.json({
      message: "Login successful",
      email,
      name,
      picture,
      admin: checkAdmin(email),
    });
  } catch (err) {
    console.error("Error verifying ID token:", err);
    return res.status(401).json({ message: "Invalid or expired ID token" });
  }
};

export const isAdmin = async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = verifyToken(token);
    const email = decoded.email;

    return res.json({ isAdmin: checkAdmin(email) });
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const getMe = async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = verifyToken(token);
    const isAdmin = checkAdmin(decoded.email);
    return res.json({
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      isAdmin,
    });
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};
