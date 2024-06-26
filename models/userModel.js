const mongoose = require("mongoose");

// Define the User schema
const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    is_verified: {
      type: Number,
      default: 0,
    },
    token: {
      type: String,
      default: "",
    },
    otp: {
      type: Number,
    },
    is_block: {
      type: Boolean,
      default: false,
    },
    wallet: {
      type: Number,
      default: 0,
    },
    walletHistory: [
      {
        transactionDate: {
          type: Date,
        },
        transactionDetails: {
          type: String,
        },
        transactionType: {
          type: String,
        },
        transactionAmount: {
          type: Number,
        },
      },
    ],
    referralCode: {
      type: String,
      unique: true,
    },
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create the User model based on the schema
const User = mongoose.model("User", UserSchema);

// Export the User model
module.exports = User;
