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
    },
  ],
  cartTotal: {
    type: Number,
    default: 0,
  },
});

// Function to calculate cartTotal
cartSchema.methods.calculateCartTotal = async function () {
  try {
    const productIds = this.products.map((item) => item.productId);
    const products = await mongoose
      .model("Product")
      .find({ _id: { $in: productIds } });

    let total = 0;

    this.products.forEach((item) => {
      const product = products.find((product) =>
        product._id.equals(item.productId)
      );
      if (product) {
        total += item.quantity * product.discountedPrice;
      }
    });

    this.cartTotal = total;
    return total;
  } catch (error) {
    throw new Error("Error calculating cartTotal");
  }
};

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;




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
    },
  ],
  cartTotal: {
    type: Number,
    default: 0,
  },
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;



// const mongoose = require("mongoose");

// const cartSchema = mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   products: [
//     {
//       productId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Product",
//         required: true,
//       },
//       quantity: {
//         type: Number,
//         default: 1,
//       },
//       price: {
//         type: Number,
//         default: 0,
//       },
//       discount: {
//         type: Number,
//         default: 0,
//       },
//     },
//   ],
//   cartTotal: {
//     type: Number,
//     default: 0,
//   },
// });

// // Define a virtual property for calculating the cartTotal
// cartSchema.virtual("totalPrice").get(function () {
//   return this.products.reduce((total, product) => {
//     const discountedPrice = product.price - product.discount;
//     return total + discountedPrice * product.quantity;
//   }, 0);
// });

// // Update the cartTotal whenever the products array changes
// cartSchema.pre("save", function (next) {
//   this.cartTotal = this.totalPrice;
//   next();
// });

// const Cart = mongoose.model("Cart", cartSchema);

// module.exports = Cart;
