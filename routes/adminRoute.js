const express = require("express");
const imageUploader = require("../config/multer");
const admin_route = express();

const couponController= require('../controllers/couponController')
const adminController = require("../controllers/adminController");
const productController = require("../controllers/productController");
const offerController = require("../controllers/offerController");
const salesController = require("../controllers/salesController");
const dashboardController = require("../controllers/dashboardController");


// Middleware
admin_route.use(express.urlencoded({ extended: true }));
admin_route.set("view engine", "ejs");
admin_route.set("views", "views/admin");

//============================== ADMIN LOGIN ===============================
admin_route.get("/adminLogin", adminController.adminLoadLogin);
admin_route.post("/adminLogin", adminController.adminVerifyLogin);

//==============================  ADMIN LOGOUT ===============================
admin_route.get("/logout", adminController.logout);

//============================== ADMIN DASHBOARD ===============================
admin_route.get("/dashboard", dashboardController.loadDashboard);


//==============================  USER MANAGEMENT ===============================
admin_route.get("/users", adminController.loadUsers);
admin_route.get("/block-user", adminController.blockUser);

//==============================  PRODUCT MANAGEMENT ===============================
admin_route.get("/product", productController.productLoad);

//==============================  CATEGORY MANAGEMENT ===============================
admin_route.get("/categories", adminController.loadCategories);


admin_route.get("/addCategory", adminController.loadAddCategory);


admin_route.post(
  "/addCategory",
  imageUploader.uploadCategory.single("image"),
  adminController.addCategory
);


admin_route.get("/editCategory/:id", adminController.editCategoryLoad);


admin_route.post(
  "/editCategory",
  imageUploader.uploadCategory.single("image"),
  adminController.editCategory
);

admin_route.get("/block-category", adminController.unlistCategory);


//==============================  PRODUCT MANAGEMENT ============================== 

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

admin_route.post(
  "/editProduct/:productId",
  imageUploader.uploadProduct.array("newImages", 5), // Update to "newImages" to match form field name
  imageUploader.productImgResize,
  productController.updateProduct
);


admin_route.post(
  "/uploadProductImages/:productId",
  imageUploader.uploadProduct.array("newImages", 5),
  imageUploader.productImgResize,
  productController.uploadProductImages
);

//==============================  PRODUCT OFFER ROUTES ====================================

admin_route.get('/offers', offerController.loadOffers);
admin_route.get('/addOff', offerController.loadAddOffer);
admin_route.post('/addOfferDB', offerController.addOffers);
admin_route.get('/deleteOff', offerController.deleteOffer);


//============================== CATEGORY OFFER ROUTES ====================================

admin_route.get("/offersCat",offerController.loadCategoryOffers);
admin_route.get("/addoffersCat", offerController.loadAddCategoryOffer);
admin_route.post("/addOfferCatDB", offerController.addCategoryOffer);
admin_route.get("/deletecatOff",  offerController.deleteCategoryOffer);



//==============================  ORDER MANAGEMENT ROUTES ==================================
admin_route.get('/orderManagement', adminController.loadOrder);
admin_route.post("/updateOrderStatus", adminController.updateOrderStatus);



//==============================  COUPON ==================================
admin_route.get("/coupon", couponController.loadCoupon);
admin_route.get("/loadAddCoupon", couponController.loadAddCoupon);
admin_route.post("/addCouponDB",  couponController.addCoupon);
admin_route.get("/loadEditCoupon",couponController.loadEditCoupon);
admin_route.post("/editCouponDB",  couponController.editCoupon);
admin_route.get("/deleteCoupon", couponController.deleteCoupon);





//==============================  SALES REPORT ==================================
admin_route.get("/salesReport", adminController.salesreportLoad);
admin_route.get('/download-pdf', adminController.pdfDownload);




//============================= EXPORTING ==================================
module.exports = admin_route;
