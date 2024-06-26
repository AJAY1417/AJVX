const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    // required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  discountPricepro: {
    type: Number,
  },
  discountPricecat: {
    type: Number,
  },
  images: {
    type: [String],
    required: true,
  },
  is_deleted: {
    type: Boolean,
    default: false,
  },
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
