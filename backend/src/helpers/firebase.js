import serviceAccount from '../../serviceAccount.json' with { type: "json" };
import admin from "firebase-admin";
import json from "jsonwebtoken";

export const initFirebase = async () => {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
};

export const isAdmin = (email) => {
  const ADMINS = process.env.ADMINS?.split(",") || [];
  return ADMINS.includes(email);
};

export const generateToken = (user) => {
  const token = json.sign(user, process.env.JWT_TOKEN, {
    expiresIn: "1h",
  });
  return token;
};

export const verifyToken = (token) => {
  if (!token) {
    throw new Error("No token provided");
  }
  return json.verify(token, process.env.JWT_TOKEN); // throws if invalid
};