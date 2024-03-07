const express = require("express");
const imageUploader = require("../config/multer");
const admin_route = express();

const couponController= require('../controllers/couponController')
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

admin_route.get("/block-category", adminController.unlistCategory);


// =================== PRODUCT MANAGEMENT ===============================

admin_route.delete(
  "/deleteProductImage/:productId/:imageIndex",
  productController.deleteProductImage
);




admin_route.get("/addProduct", productController.addProductLoad);

admin_route.post(
  "/addProduct",
  imageUploader.uploadProduct.array("images", 5),
  imageUploader.productImgResize,
  productController.addProduct
);


admin_route.get("/block-product", productController.blockProduct);
admin_route.get("/editProduct/:productId", productController.editProduct);
// Route for handling image uploads for a product
admin_route.post(
  "/editProduct/:productId",
  imageUploader.uploadProduct.array("newImages", 5), // Update to "newImages" to match form field name
  imageUploader.productImgResize,
  productController.updateProduct
);

// Add a new route for handling image uploads
admin_route.post(
  "/uploadProductImages/:productId",
  imageUploader.uploadProduct.array("newImages", 5),
  imageUploader.productImgResize,
  productController.uploadProductImages
);










//============================= ORDER MANAGEMENT ROUTES ==================================


admin_route.get('/orderManagement', adminController.loadOrder);
admin_route.post("/updateOrderStatus", adminController.updateOrderStatus);



//============================= COUPON ==================================
admin_route.get("/coupon", couponController.loadCoupon);
admin_route.get("/loadAddCoupon", couponController.loadAddCoupon);
admin_route.post("/addCouponDB",  couponController.addCoupon);
admin_route.get("/loadEditCoupon",couponController.loadEditCoupon);
admin_route.post("/editCouponDB",  couponController.editCoupon);
admin_route.get("/deleteCoupon", couponController.deleteCoupon);



//============================= EXPORTING ==================================
module.exports = admin_route;
