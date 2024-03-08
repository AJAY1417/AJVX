const { log } = require("console");
const Coupon = require("../models/couponModel");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");

//load coupon management
const loadCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.find({});
    console.log(coupon, "coupon vannu");
    res.render("coupon", { coupon });

  } catch (error) {
    console.log(error.message);
  }
};

//load add coupon to database
const loadAddCoupon = async (req, res) => {
  try {
    res.render("addCoupon");
  } catch (error) {
    console.log(error.message);
  }
};

// add coupon to database
const addCoupon = async (req, res) => {
  try {
    const data = new Coupon({
      couponname: req.body.couponname,
      couponcode: req.body.couponcode,
      discountamount: req.body.discountamount,
      activationdate: req.body.activationdate,
      expirydate: req.body.expirydate,
      criteriaamount: req.body.criteriaamount,
      userslimit: req.body.userslimit,
      description: req.body.description,
      status: "active",
    });
    await data.save();
    console.log(data);
    res.redirect("coupon");
  } catch (error) {
    console.log(error.message);
  }
};

//load edit coupon
const loadEditCoupon = async (req, res) => {
  console.log(loadEditCoupon, "editcoupon");
  try {
    const coupon = await Coupon.findOne({ _id: req.query.id });

    res.render("editCoupon", { coupon });
  } catch (error) {
    console.log(error.message);
    res.render("500");
  }
};

//edit coupon to DB
const editCoupon = async (req, res) => {
  try {
    const id = req.query.id;

    await Coupon.updateOne(
      { _id: id },
      {
        $set: {
          couponname: req.body.couponname,
          couponcode: req.body.couponcode,
          discountamount: req.body.discountamount,
          activationdate: req.body.activationdate,
          expirydate: req.body.expirydate,
          criteriaamount: req.body.criteriaamount,
          userslimit: req.body.userslimit,
          description: req.body.description,
        },
      }
    );
    res.redirect("coupon");
  } catch (error) {
    console.log(error.message);
  }
};

//delete coupon from database
const deleteCoupon = async (req, res) => {
  try {
    await Coupon.deleteOne({ _id: req.query.id });
    res.redirect("coupon");
  } catch (error) {
    console.log(error.message);
    res.render("500");
  }
};

//calculate discount on coupon
const calculateDiscountedTotal = (totalPrice, discountAmount) => {
  const discountedPrice =totalPrice - discountAmount;
  return discountedPrice;
};


const applyCoupon = async (req, res) => {
  try {
    console.log("entered applyCoupon");
    const { couponCode } = req.body;
    const userId = req.session.user_id;
    console.log(userId);

    const currentDate = new Date();

    const coupon = await Coupon.findOne({ couponcode: couponCode });
    console.log(coupon, "the coupon is here ");
    console.log(coupon.discountamount, "Coupon Discount Amount");
    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon code" });
    }

    if (!userId) {
      return res.json({ success: false, message: "User not found" });
    }

    // Check activation date
    if (currentDate < coupon.activationdate) {
      return res.json({ success: false, message: "Coupon is not yet active" });
    }

    // Check expiry date
    if (currentDate > coupon.expirydate) {
      return res.json({ success: false, message: "Coupon has expired" });
    }

    // Criteria of amount
    const cart = await Cart.findOne({ user: userId }).populate(
      "products.productId"
    ); // Populate products

    console.log(cart + "________________________");
    if (!cart) {
      return res.json({ success: false, message: "User cart not found" });
    }

    if (cart.cartTotal < coupon.criteriaamount) {
      return res.json({
        success: false,
        message: "Order total does not meet coupon criteria amount",
      });
    }

    // Update the cart with the discounted total
    const discountedTotal = calculateDiscountedTotal(
      cart.cartTotal,
      coupon.discountamount
    );
    cart.cartTotal -= coupon.discountamount;

    console.log(coupon.discountamount, "===================");
    console.log(discountedTotal, "+++++++++++++++++++++++++++");

    // Clear the discount for each product in the cart
    cart.products.forEach((product) => {
      product.discount = 0;
    });

    await cart.save(); // Save the updated cart
    console.log(cart + "_________________________");

    // Send the updated total back to the client
    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully!",
      discountedTotal,
      couponDiscountAmount: coupon.discountamount,
    });
  } catch (error) {
    console.error(error.message);
    res.render("500");
  }
};




module.exports = {
  loadCoupon,
  loadAddCoupon,
  addCoupon,
  loadEditCoupon,
  editCoupon,
  deleteCoupon,
  applyCoupon,
};
