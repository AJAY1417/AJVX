// index.js

const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/AJVX");
const nocache = require("nocache");
const express = require("express");
const session = require("express-session"); // Import express-session
const app = express();
const config = require('./config/config')
// Session configuration
app.use(
  session({
    secret: config.sessionSecret, // replace with a secure secret
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to disable back button caching
const disableBackButton = (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

// Use nocache middleware to disable caching for all routes
app.use(nocache());

// Use disableBackButton middleware for all routes
app.use(disableBackButton);

// Import userRoutes
const user_Route = require("./routes/userRoute");

// Use userRoutes for the root path
app.use("/", user_Route);

// For admin routes
const adminRoute = require("./routes/adminRoute");
app.use("/admin", adminRoute);

const path = require("path");
app.use("/public", express.static(path.join(__dirname, "public")));

const PORT = 3002;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
