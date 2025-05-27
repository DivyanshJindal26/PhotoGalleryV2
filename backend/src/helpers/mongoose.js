import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

let gfsBucket;

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Initialize GridFS
    gfsBucket = new GridFSBucket(conn.connection.db, {
      bucketName: "images",
    });

    console.log("GridFS initialized");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

export const getGridFSBucket = () => {
  if (!gfsBucket) {
    throw new Error(
      "GridFS not initialized. Make sure to call connectDB first."
    );
  }
  return gfsBucket;
};
