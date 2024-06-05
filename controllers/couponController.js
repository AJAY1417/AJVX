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
const loadEditCoupon = async (req, res) => {
  try {
    console.log("started");
    const couponId = req.query.id;
    console.log("Coupon ID:", couponId);

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).send("Coupon not found");
    }
    console.log("ffrfr", coupon);
    res.render("editCoupon", { coupon });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

//=============================== ADD COUPON ==================================
const addCoupon = async (req, res) => {
  try {
    const existingCouponName = await Coupon.findOne({
      couponname: req.body.couponname,
    });
    const existingCouponCode = await Coupon.findOne({
      couponcode: req.body.couponcode,
    });

    if (existingCouponName || existingCouponCode) {
      return res.render("addCoupon", { error: "Coupon already exists" });
    }

    // If neither coupon name nor coupon code exists, add the coupon
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
    res.status(500).send("Internal Server Error");
  }
};

//=================================   EDIT COUPON  =========================================
const editCoupon = async (req, res) => {
  try {
    const id = req.body.coupon_id;
    console.log("iddatatype   ", typeof id);
    console.log("fewfe", id);

    // Fetch the original coupon data first
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).send("Coupon not found");
    }

    const existingCoupon = await Coupon.findOne({
      couponname: req.body.couponname,
      _id: { $ne: id },
    });
    if (existingCoupon) {
      return res.render("editCoupon", {
        coupon,
        error: "Coupon name already exists",
      });
    }

    const existingCouponCode = await Coupon.findOne({
      couponcode: req.body.couponcode,
      _id: { $ne: id },
    });
    if (existingCouponCode) {
      return res.render("editCoupon", {
        coupon,
        error: "Coupon code already exists",
      });
    }

    // Convert strings to Date objects
    const activationdate = new Date(req.body.activationdate);
    const expirydate = new Date(req.body.expirydate);

    // Update the coupon in the database
    await Coupon.findByIdAndUpdate(id, {
      couponname: req.body.couponname,
      couponcode: req.body.couponcode,
      // ... other fields
      activationdate: activationdate, // Updated Date object
      expirydate: expirydate, // Updated Date object
    });

    res.redirect("coupon");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
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
  const discountedPrice = totalPrice - discountAmount;
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
//_________________________________________ REMOVE THE APPLIED COUPON _____________________________________
const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Find the user's cart
    const cart = await Cart.findOne({ user: userId }).populate(
      "products.productId"
    );

    if (!cart) {
      return res.json({ success: false, message: "User cart not found" });
    }

    // Check if couponDiscountAmount is present in the cart object
    if (!cart.couponDiscountAmount) {
      return res.json({ success: false, message: "No coupon applied" });
    }

    // Restore the original cart total by adding back the coupon discount amount
    cart.cartTotal += cart.couponDiscountAmount;

    // Clear the coupon discount amount
    cart.couponDiscountAmount = 0;

    // Clear the discount for each product in the cart
    cart.products.forEach((product) => {
      product.discount = 0;
    });

    await cart.save(); // Save the updated cart

    // Send success response with original total
    return res.status(200).json({
      success: true,
      message: "Coupon removed successfully!",
      originalTotal: cart.cartTotal, // Include the original total in the response
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
  loadCoupon,
  loadEditCoupon,
  editCoupon,
  deleteCoupon,
  applyCoupon,
  removeCoupon,
};
