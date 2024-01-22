const express = require("express");
const imageUploader = require("../config/multer");
const admin_route = express();
const adminController = require("../controllers/adminController");
const productController = require("../controllers/productController");

// Middleware
admin_route.use(express.urlencoded({ extended: true }));
admin_route.set("view engine", "ejs");
admin_route.set("views", "views/admin");

// =================== ADMIN LOGIN ===============================
admin_route.get("/adminLogin", adminController.adminLoadLogin);
admin_route.post("/adminLogin", adminController.adminVerifyLogin);

// =================== ADMIN LOGOUT ===============================

admin_route.get("/logout", adminController.logout);

// =================== ADMIN DASHBOARD ===============================
admin_route.get("/dashboard", adminController.loadDashboard);

// =================== USER MANAGEMENT ===============================
admin_route.get("/users", adminController.loadUsers);
admin_route.get("/block-user", adminController.blockUser);

// =================== PRODUCT MANAGEMENT ===============================
admin_route.get("/product", productController.productLoad);

// =================== CATEGORY MANAGEMENT ===============================
// Display all categories
admin_route.get("/categories", adminController.loadCategories);

// Add a new category (GET)
admin_route.get("/addCategory", adminController.loadAddCategory);

// Add a new category (POST)
admin_route.post(
  "/addCategory",
  imageUploader.uploadCategory.single("image"),
  adminController.addCategory
);

// Edit category page (GET)
admin_route.get("/editCategory/:id", adminController.editCategoryLoad);

// Edit category (POST)
admin_route.post(
  "/editCategory",
  imageUploader.uploadCategory.single("image"),
  adminController.editCategory
);

admin_route.get("/unlistCategory", adminController.unlistCategory);

// =================== PRODUCT MANAGEMENT ===============================
admin_route.get("/addProduct", productController.addProductLoad);

admin_route.post(
  "/addProduct",
  imageUploader.uploadProduct.array("images", 5),
  imageUploader.productImgResize,
  productController.addProduct
);

admin_route.get("/block-product", productController.blockProduct);
// Edit product page (GET)
admin_route.get("/editProduct/:productId", productController.editProductLoad);

// Edit product (POST)
admin_route.post(
  "/editProduct/:productId",
  imageUploader.uploadProduct.array("images", 5),
  imageUploader.productImgResize,
  productController.editProduct
);

module.exports = admin_route;
