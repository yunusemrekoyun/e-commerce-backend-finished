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

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
};

//middlewares
app.use(logger("dev"));
app.use(express.json());
app.use("/api", mainRoute);
app.listen(port, () => {
  connect();
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
