const User = require("../models/userModel");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const crypto = require("crypto");
require('dotenv').config();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});

// Now you can use razorpayInstance for your operations


//================================================================================================================================================================================================//

//=============================================== Load Wallet ===============================================
const loadWallet = async (req, res) => {
  try {
    const user = req.session.user_id; //user details edukunu

    const userData = await User.findById(user);

    if (!userData) {
      return res.render("wallet", {
        user: req.session.firstName,
        message: "User not found",
      });
    }

    const wallet = userData.wallet;

    res.render("wallet", { wallet: wallet });
  } catch (error) {
    console.log(error);
    res.render("500");
  }
};

//=============================================== ADDING MONEY

// Add Money to Wallet// Add Money to Wallet
const addMoneyWallet = async (req, res) => {
  try {
    const amountInRupees = req.body.amount;
    const amountInPaise = parseInt(amountInRupees * 100); // Convert rupees to paise

    console.log("Amount in paise:", amountInPaise);

    const id = await crypto.randomBytes(8).toString("hex");

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: "" + id,
    };

    razorpayInstance.orders.create(options, (err, order) => {
      if (err) {
        res.json({ status: false });
      } else {
        res.json({ status: true, payment: order });
      }
    });
  } catch (error) {
    console.error(error);
    res.render("500");
  }
};

//----------------------------------------------- Verify Wallet Payment  -----------------------------------------------------
 const verifyWalletpayment = async (req, res) => {
   try {
     const userId = req.session.user_id;
     const details = req.body;
     const amount = details.order.amount;

     let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
     hmac.update(
       details.payment.razorpay_order_id +
         "|" +
         details.payment.razorpay_payment_id
     );
     hmac = hmac.digest("hex");

     if (hmac === details.payment.razorpay_signature) {
       const userData = await User.findById(userId);

       if (!userData) {
         return res
           .status(404)
           .json({ status: false, message: "User not found" });
       }

       const walletHistory = {
         transactionDate: new Date(),
         transactionDetails: "Deposited via Razorpay",
         transactionType: "Credit",
         transactionAmount: amount / 100,
         currentBalance: (userData.wallet || 0) + amount / 100, // Use userData.wallet
       };

       await User.findByIdAndUpdate(
         userId, // Use userId here
         {
           $inc: {
             wallet: amount / 100,
           },
           $push: {
             walletHistory,
           },
         }
       );
       res.json({ status: true });
     } else {
       console.error("Razorpay Signature Verification Failed");
       res.json({ status: false, message: "Payment Verification Failed" });
     }
   } catch (error) {
     console.error("Error in verifyWalletpayment:", error);
     res.status(500).json({ status: false, message: "An error occurred" });
   }
 };

//-------------------------------------------------------------------------------------------------------




// Load Wallet History
const loadHistory = async (req, res) => {
  try {
    const user = req.session.user_id; //user details edukunu

    const userData = await User.findById(user);

    res.render("wallet-history", { wallet: userData });
  } catch (error) {
    res.render("500");
  }
};

module.exports = {
  loadWallet,
  addMoneyWallet,
  verifyWalletpayment,
  loadHistory,
};
