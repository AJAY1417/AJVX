const mongoose = require("mongoose");

const orderDetails = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  deliveryDetails: {
    type: Object,
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId, // Corrected type here
        required: true,
        ref: "Product",
      },
      count: {
        type: Number,
        default: 1,
      },
      total: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: [
          "pending",
          "Processing",
          "Shipped",
          "Delivered",
          "cancelled",
          "Returned",
          "placed",
        ],
        required: true,
      },
    },
  ],
  purchaseDate: {
    type: Date,
    required: true,
  },
  totalAmount: {
    type: Number,
  },
  status: {
    type: String,
    enum: [
      "pending",
      "Processing",
      "Shipped",
      "Delivered",
      "cancelled",
      "Returned",
      "placed",
    ],
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  paymentStatus: {
    type: String,
    required: true,
  },
  shippingMethod: {
    type: String,
  },
  shippingFee: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
});
orderDetails.statics.getDailyRevenueData = async function () {
  // Get today's date
  const today = new Date();
  // Get the start of today
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  // Get the end of today
  const endOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );
};
module.exports = mongoose.model("Order", orderDetails); // Corrected model name here
