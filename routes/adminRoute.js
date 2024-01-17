const express = require("express");
const admin_route = express();
const adminController = require("../controllers/adminController"); // Add this line

admin_route.use(express.urlencoded({ extended: true }));
admin_route.set("view engine", "ejs");
admin_route.set("views", "views/admin");

admin_route.get("/adminLogin", adminController.loadLogin);

module.exports = admin_route;
