const User = require("../models/userModel");
const Cart = require("../models/cartModel");
const mongoose = require("mongoose");

const cartMiddleware = async (req, res, next) => {
  try {
    if (req.session.user_id && typeof req.session.user_id === "string") {
      // Check if user ID is a valid string
      const userId = req.session.user_id;

      // Ensure userId is a valid ObjectId before querying the database
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.redirect("/login");
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.redirect("/login");
      }

      const cart = await Cart.findOne({ user: userId });
      const count = cart ? cart.products.length : 0;
      res.locals.cartCount = count;
    } else {
      res.locals.cartCount = 0;
    }
    next();
  } catch (error) {
    console.error("Error in cartMiddleware:", error);
    next(error);
  }
};

module.exports = cartMiddleware;
