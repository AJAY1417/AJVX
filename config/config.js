require("dotenv").config();

const sessionSecret = process.env.SESSION_SECRET;
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpaySecretKey = process.env.RAZORPAY_SECRET_KEY;
const mongodbUri = process.env.MONGODB_URI;

// console.log({
//   sessionSecret,
//   emailUser,
//   emailPassword,
//   razorpayKeyId,
//   razorpaySecretKey,
//   mongodbUri,
// });

module.exports = {
  sessionSecret,
  emailUser,
  emailPassword,
  razorpayKeyId,
  razorpaySecretKey,
  mongodbUri,
};
