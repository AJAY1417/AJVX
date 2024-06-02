const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
mongoose.connect(
  "mongodb+srv://testajay65:U0iIVbuqA2ps57Ye@cluster0.bpcezno.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);
const express = require("express");
const session = require("express-session");
const nocache = require("nocache");
const app = express();
const config = require("./config/config");
const path = require("path");
const flash = require("connect-flash");
// Import userRoutes
const userRoute = require("./routes/userRoute");

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

app.use(flash());

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

// Set view engine and views directory for EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views/users")); // Specify the correct path

// Use userRoutes for the root path
app.use("/", userRoute);

// For admin routes
const adminRoute = require("./routes/adminRoute");
app.use("/admin", adminRoute);

app.use("/public", express.static(path.join(__dirname, "public")));

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
