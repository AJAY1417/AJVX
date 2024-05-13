const mongoose = require("mongoose");
//this is a mongoose schema defintion for a coupon model
const coupondata = new mongoose.Schema({
  couponname: {
    type: String,
    required: true,
  },
  couponcode: {
    type: String,
    required: true,
  },
  discountamount: {
    type: Number,
    required: true,
  },
  activationdate: {
    type: Date,
    required: true,
  },
  userslimit: {
    type: Number,
    required: true,
  },

  expirydate: {
    type: Date,
    required: true,
  },
  criteriaamount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    // required: true
    default: "active",
  },
  claimedusers: [
    {
      type: Array,
    },
  ],
});

module.exports = mongoose.model("Coupon", coupondata);
