const express = require("express");
const user_route = express();
const session = require("express-session");
const config = require("../config/config");

const userController = require("../controllers/userController");
const cartController = require("../controllers/cartController ");
const accountController = require("../controllers/accountController");
const orderController = require("../controllers/orderController");
const walletController = require("../controllers/walletController");
const couponController = require("../controllers/couponController");
const invoiceController = require("../controllers/InvoiceController");
const productController = require("../controllers/productController");

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


const cartCount = require("../middlewares/cartCount");
user_route.use(cartCount)

// Custom middleware to add user session to every response
const addUserToResponse = (req, res, next) => {
  res.locals.user = req.session.user_id;
  next();
};
user_route.use(addUserToResponse);

// ============================ HOME =======================================
user_route.get("/", userController.loadHome);

// ============================ REGISTER =======================================
user_route.get("/register", userController.loadRegister);
user_route.post("/register", userController.insertUser);

// ============================ LOGIN =======================================
user_route.get("/login", userController.loginLoad);
user_route.post("/login", userController.verifyLogin);

// ============================ OTP =======================================
user_route.get("/otp", (req, res) => {
  res.render("otp");
});
user_route.post("/otp", userController.verifyOtp);
user_route.post("/resendOtp", userController.resendOtp);

// ============================ PRODUCT =======================================
user_route.get("/shop", userController.shopLoad);
user_route.get("/productDetail", userController.productDetailLoad);
user_route.get("/search", productController.search);
user_route.post("/filterProducts", productController.filterProducts);
user_route.get("/allProducts", productController.getAllProducts);


// ============================ WISHLIST =======================================
user_route.get("/wishlist", userController.loadWishlist);
user_route.post("/addToWishlist", userController.addtoWishlist);
user_route.get("/deleteWishlistProduct", userController.deleteWishlistproduct);

// ============================ CART =======================================
user_route.get("/cart", cartController.loadCart);
user_route.post("/addTocart", cartController.addToCart);
user_route.post("/updateCartQuantity", cartController.updateCartQuantity);
user_route.get("/removeCartProduct", cartController.removeCartProduct);

// ============================ LOGOUT =======================================
user_route.get("/logout", userController.logout);

// ============================ ACCOUNT=======================================
user_route.get("/profile", accountController.loadMyAccount);
user_route.get("/editAddress", accountController.loadEditaddress);
user_route.post("/editAddress", accountController.editAddress);
user_route.get("/addAddress", accountController.loadAddAddress);
user_route.post("/addAddress", accountController.addAddress);
user_route.post("/updateDetails", accountController.userDetails);
user_route.get("/resetPasswordLoad", accountController.showResetForm);
user_route.post(
  "/validateCurrentPassword",
  accountController.validateCurrentPassword
);
user_route.post("/resetPassword", accountController.resetPassword);
user_route.get("/orderDetails/:id", accountController.showOrderDetails);

// ============================ WALLET  =======================================
user_route.get("/view-wallet", walletController.loadWallet);
user_route.post("/add-wallet", walletController.addMoneyWallet);
user_route.post("/verifyWalletpayment", walletController.verifyWalletpayment);
user_route.get("/wallet-history", walletController.loadHistory);

// ============================ CHECKOUT =======================================
user_route.get("/checkout", orderController.loadCheckout);

// ============================ ORDERS =======================================
user_route.post("/cancelOrder", orderController.cancelOrder);
user_route.get("/orderSuccess", orderController.orderSuccess);
user_route.post("/orderPlace", orderController.placeOrder);
user_route.post("/returnOrder", orderController.orderReturnPOST);

// ============================ PAYMENT =======================================
user_route.post("/verifyPayment", orderController.verifyPayment);
user_route.post("/repayOrder/:orderId", orderController.repayOrder);

// ============================ COUPONS =======================================
user_route.post("/applyCoupon", couponController.applyCoupon);
user_route.post("/removeCoupon", couponController.removeCoupon);

// ============================ INVOICE =======================================
user_route.get("/generateInvoice/:orderId", invoiceController.generateInvoice);

// ============================ EXPORTS =======================================
module.exports = user_route;
