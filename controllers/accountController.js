const User = require("../models/userModel");
const Address = require("../models/addressModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const product = require("../models/productModel");
const Order = require("../models/orderModel");

// load myAccount dasboard
// load myAccount dashboard
const loadMyAccount = async (req, res) => {
  try {
    console.log("entered the function");

    // Find the user by ID
    const user = await User.findOne({ _id: req.session.user_id });

    // Check if the user is found
    if (!user) {
      console.log("User not found");
      // You can redirect to a different page or handle it in a way that makes sense for your application
      return res.status(404).send("User not found");
    }

    console.log("User found:", user);

    // Retrieve addresses, order data, and wallet details
    const addresses = await Address.find({ userId: req.session.user_id });
    const orderData = await Order.find({ userId: req.session.user_id })
      .populate("products.product")
      .sort({ purchaseDate: -1 });

    // Assuming wallet details are present in the user object
    const walletBalance = user.wallet;
    const walletHistory = user.walletHistory;

    res.render("profile", {
      UserAddress: addresses,
      userName: user.firstName,
      orderData: orderData,
      User: user,//userdb = user
      walletBalance: walletBalance,
      walletHistory: walletHistory,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


//load edit Address
const loadEditaddress = async (req, res) => {
  try {
    let userName;
    // Initialize userAdd as an empty array
    let userAdd = [];
    const addressid = req.query.id;
    console.log(addressid);
    if (req.session.user_id) {
      const user = await User.findOne({ _id: req.session.user_id });
      const UserAddress = await Address.findOne({ _id: addressid });

      if (user) {
        userName = user.name;
        if (UserAddress) {
          userAdd = UserAddress.address; // Set userAdd to the address data if available
        }
      }
    }

    res.render("editAddress", { userName, userAdd });
  } catch (error) {
    console.log(error.message);
    res.render("500");
  }
};

// load add Address
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

//add address to db

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

    // Create an object with the fields to update
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

    // Use updateOne to update the specified subdocument in the array
    const updatedAddress = await Address.updateOne(
      { "address._id": id, address: { $elemMatch: { _id: id } } },
      { $set: updateFields },
      { upsert: true } // Allow the address to be created if it doesn't exist
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




module.exports = {
  loadMyAccount,
  loadEditaddress,
  loadAddAddress,
  addAddress,
  editAddress,
  userDetails,
  
};
