const express = require("express");
const user_route = express();
const session = require("express-session");
const config = require("../config/config");
const userController = require("../controllers/userController");
const auth = require("../middlewares/user");

user_route.set("view engine", "ejs");
user_route.set("views", "./views/users");

user_route.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
  })
);

//homepage
user_route.get("/", userController.loadHome);

//register
user_route.get("/register", userController.loadRegister);
user_route.post("/register", userController.insertUser);

//login
user_route.get("/login", userController.loginLoad);
user_route.post("/login", userController.verifyLogin);

//otp
//otp
user_route.get("/otp", (req, res) => {
  // Handle rendering of the OTP page, e.g., res.render("otp");
  // You can add any necessary logic here
  res.render("otp");
});

// Handle POST requests to /otp for OTP verification
user_route.post("/otp", userController.verifyOtp);

//resend otp
user_route.post("/resendOtp", userController.resendOtp);

module.exports = user_route;
