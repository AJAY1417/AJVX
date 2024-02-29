const express = require("express");
const user_route = express();
const session = require("express-session");
const config = require("../config/config");

const userController = require("../controllers/userController");
const cartController = require("../controllers/cartController ");
const accountController = require("../controllers/accountController");
const orderController = require("../controllers/orderController");
const { isLogin, isLogout } = require("../middlewares/auth");

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
  // Handle rendering of the OTP page, e.g., res.render("otp");
  // You can add any necessary logic here
  res.render("otp");
});

// Handle POST requests to /otp for OTP verification
user_route.post("/otp", userController.verifyOtp);

// Resend OTP
user_route.post("/resendOtp", userController.resendOtp);

// ============================ PRODUCT =======================================

user_route.get("/shop", userController.shopLoad);
user_route.get("/productDetail", userController.productDetailLoad);
user_route.get("/search", userController.searchProducts);

// ============================ WISHLIST =======================================
// Load Wishlist
user_route.get('/wishlist', isLogin, userController.loadWishlist);

// Add Product to Wishlist
user_route.post("/addToWishlist", isLogin, userController.addtoWishlist);

// Delete Wishlist Product
user_route.post(
  "/deleteWishlistProduct",
  isLogin,
  userController.deleteWishlistproduct
);

// ============================ CART =======================================
user_route.get("/cart", isLogin, cartController.loadCart);
user_route.post("/addTocart", isLogin, cartController.addToCart);
user_route.post(
  "/updateCartQuantity",
  isLogin,
  cartController.updateCartQuantity
);
user_route.get("/removeCartProduct", isLogin, cartController.removeCartProduct);
// ============================ LOGOUT =======================================

user_route.get("/logout", isLogout, userController.logout);

// ============================ ACCOUNT=======================================
user_route.get("/profile", isLogin, accountController.loadMyAccount);
user_route.get("/editAddress", isLogin, accountController.loadEditaddress);
user_route.post("/editAddress", isLogin, accountController.editAddress);
user_route.get("/addAddress", isLogin, accountController.loadAddAddress);
user_route.post("/addAddress", isLogin, accountController.addAddress);
user_route.post("/updateDetails", isLogin, accountController.userDetails);

// ============================ CHECKOUT =======================================

user_route.get("/checkout", isLogin, orderController.loadCheckout);
// ============================ ORDERS =======================================
user_route.post("/cancelOrder", isLogin, orderController.cancelOrder);
user_route.get("/orderSuccess", isLogin, orderController.orderSuccess);
user_route.post("/orderPlace", isLogin, orderController.placeOrder);

// ============================ PAYMENT =======================================
user_route.post("/verifyPayment", isLogin, orderController.verifyPayment);

// ============================ EXPORTS =======================================

module.exports = user_route;
