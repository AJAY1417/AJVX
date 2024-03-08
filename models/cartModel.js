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
      discount: {
        type: Number,
        default: 0,
      },
    },
  ],
  cartTotal: {
    type: Number,
    default: 0,
  },
});

// Define a virtual property for calculating the cartTotal
cartSchema.virtual("totalPrice").get(function () {
  const calculatedTotal = this.products.reduce((total, product) => {
    return total + product.price * product.quantity;
  }, 0);
  console.log("Calculated totalPrice:", calculatedTotal);
  return calculatedTotal;
});

// Update the cartTotal whenever the products array changes
cartSchema.pre("save", async function (next) {
  try {
    this.cartTotal = this.totalPrice; // Update cartTotal
    console.log("Updated cartTotal:", this.cartTotal);
    next();
  } catch (error) {
    console.error("Error in pre('save') hook:", error);
    next(error); // Pass the error to the next middleware or function
  }
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
