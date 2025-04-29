require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const mainRoute = require("./routes/index.js");
const app = express();
const cors = require("cors");
const logger = require("morgan");
const port = 5000;
dotenv.config();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());

// ROUTES
app.use("/api", mainRoute);

// 404 Not Found Handler
app.all("*", (req, res, next) => {
  const error = new Error(`Bu istek yolu bulunamadı: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global Error Handler
const errorHandler = require("./middlewares/errorHandler");
app.use(errorHandler);

// DATABASE CONNECTION AND SERVER START
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
};

app.listen(port, () => {
  connect();
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
