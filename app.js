const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

const userRoutes = require("./routes/user");
const codeCompilerRoutes = require("./routes/codeCompiler");

const app = express();

mongoose
  .connect(
    "mongodb+srv://" +
      process.env.MONGO_UNAME +
      ":" +
      process.env.MONGO_PW +
      "@codecompanion.mss4qje.mongodb.net/"
  )
  .then(() => {
    console.log("Connected to Database");
  })
  .catch(() => {
    console.log("Connection failed");
  });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use("/images", express.static(path.join("backend/images")));

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:4200");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With,content-type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.use("/api/code", codeCompilerRoutes);
app.use("/api/user", userRoutes);

module.exports = app;
