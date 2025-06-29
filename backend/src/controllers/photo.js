import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fileModel from "../models/image.model.js"; // Adjust the import path as necessary
import { getGridFSBucket } from "../helpers/mongoose.js"; // Assuming your helper file is named gridfs.js
import { Readable } from "stream";
import { Types } from "mongoose";
import { verifyToken } from "../helpers/firebase.js";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.memoryStorage();
const upload = multer({ storage }).array("files");

const VIRUS_TOTAL_API_KEY = process.env.VIRUS_TOTAL_API_KEY;

// Function to scan file using VirusTotal API
const scanWithVirusTotal = async (fileBuffer) => {
  try {
    const form = new FormData();
    form.append("file", fileBuffer, { filename: "file" });

    const res = await axios.post(
      "https://www.virustotal.com/api/v3/files",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "x-apikey": VIRUS_TOTAL_API_KEY,
        },
      }
    );

    return res.data.data.id;
  } catch (err) {
    console.error("Error uploading file to VirusTotal:", err.message);
    throw new Error("Virus scan failed");
  }
};

// Function to fetch scan results from VirusTotal
const getScanResults = async (scanId) => {
  console.log("scanid", scanId);
  try {
    const res = await axios.get(
      `https://www.virustotal.com/api/v3/analyses/${scanId}`,
      {
        headers: {
          "x-apikey": VIRUS_TOTAL_API_KEY,
        },
      }
    );
    const { data } = res.data;
    const isInfected = data.attributes.stats.malicious > 0;

    return isInfected;
  } catch (err) {
    console.error("Error fetching scan results:", err.message);
    throw new Error("Error fetching scan results");
  }
};

// Function to compress the image buffer
const compressImageBuffer = async (buffer) => {
  return await sharp(buffer)
    .rotate()
    .resize(800)
    .jpeg({ quality: 70 })
    .toBuffer();
};

// Upload images using GridFS
export const uploadImages = (req, res) => {
  console.log("Received request to upload images");
  upload(req, res, async (err) => {
    if (err) {
      console.error("File upload error:", err.message);
      return res
        .status(500)
        .json({ message: "File upload failed", error: err.message });
    }
    console.log("Files received for upload:", req.files.length);
    if (!req.files || req.files.length === 0) {
      console.warn("No files uploaded");
      return res.status(400).json({ message: "No files uploaded" });
    }
    console.log(`Received ${req.files.length} files for upload:`);
    try {
      const gfs = getGridFSBucket();
      let uploadedFiles = [];

      for (const file of req.files) {
        console.log(
          `Processing file: ${file.originalname} (${file.size} bytes)`
        );

        // VirusTotal scan
        try {
          const scanId = await scanWithVirusTotal(file.buffer);
          const isInfected = await getScanResults(scanId);

          if (isInfected) {
            console.warn(
              `Virus detected in file ${file.originalname}, skipping`
            );
            continue; // Skip this file and proceed with the next one
          }
        } catch (virusError) {
          console.warn(
            `VirusTotal error for ${file.originalname}, skipping: ${virusError.message}`
          );
          continue; // Skip this file if there's any error from VirusTotal
        }

        console.log(`File ${file.originalname} is clean.`);

        // Compress image
        const compressedBuffer = await compressImageBuffer(file.buffer);

        // Convert buffer to stream
        const readableStream = Readable.from(compressedBuffer);

        // Upload to GridFS
        const uploadStream = gfs.openUploadStream(file.originalname, {
          contentType: file.mimetype,
          metadata: {
            uploader: req.body.uploaderName || "unknown",
            event: req.body.event || "",
            uploaderEmail: req.body.userEmail || "unknown",
            title: req.body.title || "",
            approval: req.body.approved === "true",
          },
        });

        readableStream.pipe(uploadStream);

        await new Promise((resolve, reject) => {
          uploadStream.on("error", (err) => reject(err));
          uploadStream.on("finish", () => resolve());
        });

        // Store metadata
        const newFile = new fileModel({
          fileId: uploadStream.id.toString(),
          fileName: file.originalname,
          uploader: req.body.uploaderName || "unknown",
          event: req.body.event || "",
          uploaderEmail: req.body.userEmail || "unknown",
          uploadedAt: Date.now(),
          approval: req.body.approved === "true",
          title: req.body.title,
          contentType: file.mimetype,
          fileSize: compressedBuffer.length, // compressed size in bytes
        });

        await newFile.save();

        uploadedFiles.push({
          filename: file.originalname,
          fileId: uploadStream.id.toString(),
        });
      }

      console.log("All files uploaded successfully!");
      return res.status(200).json({
        message: "Files uploaded successfully",
        files: uploadedFiles,
      });
    } catch (error) {
      console.error("Error during upload:", error.message);
      return res.status(500).json({
        message: "Error during file processing",
        error: error.message,
      });
    }
  });
};

export const likePhoto = async (req, res) => {
  const { id } = req.params;
  const token = req.cookies.token;

  // Check for token presence
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Decode token to get user email
    const decoded = verifyToken(token);
    const userId = decoded.email;

    // Find the photo by fileId
    const photo = await fileModel.findOne({ fileId: id });

    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    // Check if user has already liked the photo
    if (photo.likedBy.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You have already liked this photo" });
    }

    // Increment like count and add userId to likedBy
    photo.likes = (photo.likes || 0) + 1;
    photo.likedBy.push(userId);

    await photo.save();

    return res.status(200).json({
      message: "Photo liked successfully",
      likes: photo.likes,
    });
  } catch (err) {
    console.error("Error liking photo:", err);
    return res.status(500).json({
      message: "Error liking photo",
      error: err.message,
    });
  }
};

// 4. Get like count
export const getLikes = async (req, res) => {
  const { id } = req.params;

  try {
    const file = await fileModel.findOne({ fileId: id });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.status(200).json({ likes: file.likes || 0 });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching likes", error: err.message });
  }
};

// 5. Download file from GridFS
export const downloadPhoto = async (req, res) => {
  const { id } = req.params;
  const gfs = getGridFSBucket();

  try {
    const file = await fileModel.findOne({ fileId: id });
    if (!file) {
      return res.status(404).json({ message: "Metadata not found" });
    }

    const downloadStream = gfs.openDownloadStream(file.fileId);

    // Load watermark image and resize it
    const logoPath = path.join(__dirname, "../assets/ico.png");
    const resizedLogoBuffer = await sharp(logoPath)
      .resize({ width: 100 }) // resize as needed
      .toBuffer();

    // Create SVG overlay with text
    const svgTextOverlay = Buffer.from(`
      <svg width="800" height="100">
        <text x="400" y="70" font-size="18" text-anchor="middle" fill="white" font-family="Arial" opacity="0.8">
          All Rights Reserved by SnTC, IIT Mandi
        </text>
      </svg>
    `);

    // Transform stream using sharp
    const transform = sharp()
      .composite([
        { input: resizedLogoBuffer, gravity: "southeast" },
        { input: svgTextOverlay, gravity: "south" },
      ])
      .jpeg()
      .on("error", (err) => {
        console.error("Sharp error:", err.message);
        res.status(500).json({ message: "Image processing failed" });
      });

    // Set response headers
    res.set({
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
    });

    // Pipe GridFS image → sharp → response
    downloadStream.pipe(transform).pipe(res);
  } catch (err) {
    console.error("Error downloading image:", err.message);
    return res.status(500).json({
      message: "Error downloading file",
      error: err.message,
    });
  }
};

export const imageFilters = async (req, res) => {
  const { event, startDate, endDate, approved, uploader } = req.query;

  const query = {};

  if (event) query.event = event;
  if (uploader) query.uploader = uploader;

  if (startDate || endDate) {
    query.uploadedAt = {};
    if (startDate) query.uploadedAt.$gte = new Date(startDate);
    if (endDate) query.uploadedAt.$lte = new Date(endDate);
  }

  if (approved !== undefined) {
    query.approval = approved === "true";
  }

  try {
    const files = await fileModel
      .find(query)
      .sort({ likes: -1, uploadedAt: -1 })
      .lean();

    if (files.length === 0) {
      return res
        .status(404)
        .json({ message: "No files found matching the filters" });
    }

    return res.status(200).json({
      msg: "Files fetched successfully",
      files: files,
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Error fetching files",
      error: err.message,
    });
  }
};

export const viewImage = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ message: "ID is required" });
  if (!Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid ID format" });

  const gfs = getGridFSBucket();

  try {
    const file = await fileModel.findOne({ fileId: id });
    if (!file) return res.status(404).json({ message: "Metadata not found" });

    const fileObjId = new Types.ObjectId(id);
    const downloadStream = gfs.openDownloadStream(fileObjId);

    const logoPath = path.join(__dirname, "../assets/ico.png");
    const logoBuffer = await sharp(logoPath)
      .resize({ width: 100 }) // resize logo to 100px wide (adjust as needed)
      .toBuffer();

    // Convert image stream + add watermark using sharp
    const imageTransformer = sharp()
      .composite([
        {
          input: logoBuffer,
          gravity: "southeast", // bottom-right
          blend: "over",
        },
      ])
      .on("error", async (err) => {
        console.error("Sharp error:", err.message);
        res.status(500).json({ message: "Image processing failed" });
      });

    res.set({
      "Content-Type": file.contentType || "image/jpeg",
      "Content-Disposition": `inline; filename="${file.fileName}"`,
    });

    downloadStream.on("error", async (err) => {
      console.error("Stream error:", err.message);
      try {
        await gfs.delete(fileObjId);
        await fileModel.deleteOne({ fileId: id });
        console.log(`Deleted corrupt file: ${id}`);
      } catch (deleteErr) {
        console.error("Error during cleanup:", deleteErr.message);
      }

      return res.status(404).json({
        message: "File was corrupt or missing. Deleted from database.",
      });
    });

    // Pipe through sharp to apply watermark, then to response
    downloadStream.pipe(imageTransformer).pipe(res);
  } catch (err) {
    console.error("Error viewing image:", err);
    return res.status(500).json({
      message: "Error viewing image",
      error: err.message,
    });
  }
};
