import express from "express";
import router from "./routes/index.js";
import { logger } from "./middleware/logger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/error.js";
import { initFirebase } from "./helpers/firebase.js";
import { connectDB } from "./helpers/mongoose.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from 'dotenv';
dotenv.config();


const port = process.env.PORT || 5000;
const app = express();

await connectDB();
await initFirebase();

// Body parser middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(logger);

app.use("/api", router);

// app.use(notFound);
app.use(errorHandler);

app.listen(port, "0.0.0.0", () =>
  console.log(`Server is running on port ${port}`)
);
