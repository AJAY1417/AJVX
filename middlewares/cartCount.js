const User = require("../models/userModel");
const Cart = require("../models/cartModel");

const cartMiddleware = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      const userId = req.session.user_id;
      const user = await User.findById(userId);

      if (!user) {
        return res.redirect("/login");
      }

      const cart = await Cart.findOne({ user: userId });
      const count = cart ? cart.products.length : 0;


      res.locals.count = count;
     
    } else {
      res.locals.count = 0;
    }
    next();
  } catch (error) {
    console.error("Error in cartMiddleware:", error);
    next(error);
  }
};

module.exports = cartMiddleware;
