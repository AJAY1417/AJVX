
const mongoose = require("mongoose");


const cartSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        default: 1,
      },
      price: {
        type: Number,
        default: 0,
      },
      totalPrice: {
        type: Number,
        default: function () {
          return this.price * this.quantity;
        },
      },
    },
  ],
});
const Cart = mongoose.model("Cart", cartSchema); // Fix: Use "Cart" instead of "cart"

module.exports = Cart; 