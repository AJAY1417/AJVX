const User = require("../models/userModel");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const crypto = require("crypto");
dotenv.config();
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_SECRET_KEY,
});

// Load Wallet
const loadWallet = async (req, res) => {
  try {
    // const name = req.session.firstName;
    const userData = await User.findOne({ firstName: "Ajay" });
    const userId = userData._id;

    const wallet = await User.findOne({ _id: userId });

    res.render("wallet", {
      user: req.session.firstName,
      wallet: wallet,
    });
  } catch (error) {
    console.log(error);
    res.render("500");
  }
};

// Add Money to Wallet
const addMoneyWallet = async (req, res) => {
  try {
     
    const amountInRupees = req.body.amount;
    const amountInPaise = parseInt(amountInRupees) ;
   
    console.log("kjhjhjkh", amountInPaise);
    const id = await crypto.randomBytes(8).toString("hex");
    console.log('idddddd',id);
    const options = {
      amount: amountInPaise*100,
      currency: "INR",
      receipt: "" + id,
    };
    // console.log('pjhjkhjkh',options);
    razorpayInstance.orders.create(options, (err, order) => {
      if (err) {
        res.json({ status: false });
      } else {
        res.json({ status: true, payment: order });
      }
    });
  } catch (error) {
    res.render("500");
  }
};

// Verify Wallet Payment
const verifyWalletpayment = async (req, res) => {
  try {
  console.log('kjkeljkljkljlkjkljkl');
    
    const userData = await User.findOne({ firstName: 'Ajay' });
    console.log('aaaaaa',userData);
    const userId =userData._id

    const details = req.body;
    console.log('kkkkkkkkkkkkkkkk',details);

    const amount = details.order.amount
    console.log('amount',amount);
    
    let hmac = crypto.createHmac("sha256", "f4QOCHAFThYVJH9z8lX8OPhN");
     console.log('hmaccccccccccccccc',hmac);
    hmac.update(
      details.payment.razorpay_order_id +
      "|" +
      details.payment.razorpay_payment_id
    );
    hmac = hmac.digest("hex");
    console.log('hhhhhhhhhhhhhhhhhhhhhh',hmac);
    if (hmac == details.payment.razorpay_signature) {
      const walletHistory = {
        transactionDate: new Date(),
        transactionDetails: "Deposited via Razorpay",
        transactionType: "Credit",
        transactionAmount: amount,
        currentBalance: !isNaN(userId.wallet) ? userId.wallet + amount : amount,
      };
      await User.findOneAndUpdate(
        { firstName: 'Ajay' },
        {
          $inc: {
            wallet: amount,
          },
          $push: {
            walletHistory,
          },
        }
      );
      res.json({ status: true });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.log(error);
    res.render("500");
  }
};

// Load Wallet History
const loadHistory = async (req, res) => {
  try {
    // const firstName = req.session.user;
    const userData = await User.findOne({ firstName: 'Ajay' });
    const userId = userData._id;
    const details = await User.findOne({ _id: userId });

    res.render("wallet-history", {  wallet: details });
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
