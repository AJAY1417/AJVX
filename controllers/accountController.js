const User = require("../models/userModel");
const Address = require("../models/addressModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const product = require("../models/productModel");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel")
const Swal = require("sweetalert2");
const { v4: uuidv4 } = require('uuid');


const loadMyAccount = async (req, res) => {
  try {
    console.log("entered the function");

    const user = await User.findOne({ _id: req.session.user_id });

    if (!user) {
      console.log("User not found");
      return res.status(404).send("User not found");
    }

    console.log("User found:", user);

    const addresses = await Address.find({ userId: req.session.user_id });
    const orderData = await Order.find({ userId: req.session.user_id })
      .populate("products.product")
      .sort({ purchaseDate: -1 });

    const walletBalance = user.wallet;
    const walletHistory = user.walletHistory;

    res.render("profile", {
      UserAddress: addresses,
      userName: user.firstName,
      orderData: orderData,
      User: user, //userdb = user
      walletBalance: walletBalance,
      walletHistory: walletHistory,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

//================================================= EDIT ADDRESS ==========================================================================================
const loadEditaddress = async (req, res) => {
  try {
    let userName;
    let userAdd = [];
    const addressid = req.query.id;
    console.log(addressid);
    if (req.session.user_id) {
      const user = await User.findOne({ _id: req.session.user_id });
      const UserAddress = await Address.findOne({ _id: addressid });

      if (user) {
        userName = user.name;
        if (UserAddress) {
          userAdd = UserAddress.address;
        }
      }
    }

    res.render("editAddress", { userName, userAdd });
  } catch (error) {
    console.log(error.message);
    res.render("500");
  }
};

const loadAddAddress = async (req, res) => {
  try {
    let userName;
    if (req.session.user_id) {
      const user = await User.findOne({ _id: req.session.user_id });
      console.log(user);
      if (user) {
        userName = user.name;
        return res.render("addAddress", { userName });
      }
    } else {
      res.render("addAddress", { userName });
    }
  } catch (error) {
    console.log(error.message);
    res.render("500");
  }
};

//================================================= ADD ADDRESS ==========================================================================================

const addAddress = async (req, res) => {
  try {
    let userId;
    if (req.session.user_id) {
      const user = await User.findOne({ _id: req.session.user_id });
      userId = user._id;
      console.log(userId);
      const addressData = {
        userId: user._id,
        address: {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          mobile: req.body.mobile,
          email: req.body.email,
          houseNo: req.body.houseNo,
          city: req.body.city,
          state: req.body.state,
          zipcode: req.body.zipcode,
          additionalDetails: req.body.additionalDetails,
        },
      };
      const newAddress = new Address(addressData);

      await newAddress.save();
      res.redirect("/profile");
    }
  } catch (error) {
    console.log(error.message);
    res.render("500");
  }
};

//=================================== Edit Address in Database ========================================================

const editAddress = async (req, res) => {
  try {
    const id = req.query.id;

    const updateFields = {
      "address.$.firstName": req.body.firstName,
      "address.$.lastName": req.body.lastName,
      "address.$.mobile": req.body.mobile,
      "address.$.email": req.body.email,
      "address.$.houseNo": req.body.houseNo,
      "address.$.city": req.body.city,
      "address.$.state": req.body.state,
      "address.$.zipcode": req.body.zipcode,
      "address.$.additionalDetails": req.body.additionalDetails,
    };

    const updatedAddress = await Address.updateOne(
      { "address._id": id, address: { $elemMatch: { _id: id } } },
      { $set: updateFields },
      { upsert: true }
    );

    console.log(updateFields);
    console.log(updatedAddress);

    res.redirect("/profile");
  } catch (error) {
    console.error(error.message);
    res.render("editAddress", { message: "An error occurred" });
  }
};

// This function is not used in the code
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 8);
    console.log(passwordHash);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const userDetails = async (req, res) => {
  try {
    const newDetails = {
      lastName: req.body.lastName,
      firstName: req.body.firstName,
      mobile: req.body.mobile,
      // No need for secure password function here
      // password: hashedPassword,
    };
    console.log(newDetails);

    // Use findByIdAndUpdate to update user details by their ID
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user_id,
      newDetails,
      { new: true } // Return the updated user object
    );

    console.log(updatedUser);
    res.redirect("/profile");
  } catch (error) {
    console.log(error.message);
  }
};

//================================================= PASSWORD RESET ==========================================================================================

const showResetForm = (req, res) => {
  res.render("resetPassword");
};

const validateCurrentPassword = async (req, res) => {
  try {
    console.log("Entered the validate current password function");
    console.log("Session:", req.session);

    const userId = req.session.user_id;
    console.log("User ID from session:", userId);

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    const user = await User.findById(userId);
    console.log("User found in database:", user);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const { currentPassword } = req.body;
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (isMatch) {
      return res.status(200).json({ valid: true, userId: userId }); // Include userId in the response
    } else {
      return res
        .status(400)
        .json({ valid: false, message: "Current password is incorrect." });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
const resetPassword = async (req, res) => {
  try {
    console.log("entered the reset");
    const userId = req.session.user_id;
    console.log("User ID from session:", userId);
    const { newPassword } = req.body;
    console.log(req.body);

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// const showOrderDetails = async (req, res, next) => {
//   try {
//     const userId = req.session.user_id;
//     const orderId = req.params.id;
//     const trackId = `${Date.now()}-${uuidv4()}`;

//     let order;

//     if (orderId) {
//       order = await Order.findOne({ _id: orderId })
//         .populate({ path: "products.product", model: "Product" })
//         .sort({ purchaseDate: -1 });
//     } else {
//       order = await Order.findOne({ userId: userId })
//         .populate({ path: "products.product", model: "Product" })
//         .sort({ purchaseDate: -1 });
//     }

//     const products = await Cart.findOne({ user: userId }).populate({
//       path: "products.product",
//       model: "Product",
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "No orders found",
//       });
//     }

//     res.render("orderDetails", {
//       order,
//       trackId,
//       products,
//       user: req.session.user,
//     }); // Pass the trackId to the view
//   } catch (error) {
//     next(error);
//   }
// };
const showOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log("Searching for order with ID:", orderId);

    const order = await Order.findById(orderId).populate("products.product");

    if (!order) {
      console.log("Order not found for ID:", orderId);
      return res.status(404).send("Order not found");
    }

    console.log("Order found:", order);
    const address = await Address.findOne({ userId: order.userId });
    res.render("orderDetails", { order, shippingAddress: address });
  } catch (error) {
    console.error("Error retrieving order:", error);
    res.status(500).send("Internal Server Error");
  }
};



module.exports = {
  loadMyAccount,
  loadEditaddress,
  loadAddAddress,
  addAddress,
  editAddress,
  userDetails,
  showResetForm,
  validateCurrentPassword,
  resetPassword,
  showOrderDetails,
};
