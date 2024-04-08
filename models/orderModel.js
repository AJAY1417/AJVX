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

module.exports = mongoose.model("Order", orderDetails); // Corrected model name here
