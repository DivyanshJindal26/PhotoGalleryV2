import json from "jsonwebtoken";

export const isAdmin = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token found" });
  }

  try {
    const decoded = json.verify(token, process.env.JWT_TOKEN);
    const email = decoded.email;

    if (!email) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const ADMINS = process.env.ADMINS?.split(",") || [];
    const isAdmin = ADMINS.includes(email);

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }

    // Optionally attach user info to req
    req.user = decoded;

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or expired token" });
  }
};

export const checkAdminStatus = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!isAdmin(decoded.email)) return res.sendStatus(403);
    req.user = decoded;
    next();
  } catch {
    res.sendStatus(403);
  }
};
