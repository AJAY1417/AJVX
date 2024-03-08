const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const mongoose = require("mongoose");

//=========================================================================

//============================ LOAD THE CART ==============================
const loadCart = async (req, res) => {
  try {
    let totalSum = 0;
    let totalQuantity = 0;

    // Check if user is authenticated
    if (!req.session || !req.session.user_id) {
      return res.redirect("/login"); // Redirect to the login page if not logged in
    }

    const userId = req.session.user_id;
    const user = await User.findById(userId);

    if (!user) {
      return res.redirect("/login"); // Redirect to the login page if user not found
    }

    const hasCart = await Cart.findOne({ user: userId }).populate(
      "products.productId"
    );

    if (hasCart && hasCart.products) {
      hasCart.products.forEach((product) => {
        product.sum = product.quantity * product.price;
        totalSum += product.sum;
        totalQuantity += product.quantity;
      });

      let datatotal = hasCart.products.map((product) => {
        return product.price * product.quantity;
      });

      console.log("Rendering Cart Page");
      res.render("cart", {
        cartItems: hasCart,
        totalSum,
        datatotal,
        totalQuantity,
      });
    } else {
      console.log("Rendering Cart Page with Empty Cart");
      res.render("cart", { cartItems: [], totalSum, totalQuantity });
    }
  } catch (error) {
    console.error("Error in loadCart:", error);
    res.status(500).send("Internal Server Error");
  }
};

//=============================  ADD TO CART  =========================================
const addToCart = async (req, res) => {
  try {
    const { id: productId } = req.body;
    const { user_id: userId } = req.session;

    if (!userId) {
      return res.json({ loginRequired: true });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.json({ error: "User not found" });
    }

    const productData = await Product.findById(productId);

    if (!productData) {
      return res.status(404).json({ error: "Product not found" });
    }

    const userCart = await Cart.findOne({ user: userId });

    let productPrice = productData.price;

    if (userCart) {
      const productExistIndex = userCart.products.findIndex(
        (product) => product.productId == productId
      );

      if (productExistIndex !== -1) {
        const cartProduct = userCart.products[productExistIndex];
        const { quantity } = cartProduct;

        if (productData.quantity <= quantity) {
          return res.json({ outofstock: true });
        } else {
          await Cart.updateOne(
            { user: userId, "products.productId": productId },
            { $inc: { "products.$.quantity": 1 } }
          );
        }
      } else {
        await Cart.updateOne(
          { user: userId },
          { $push: { products: { productId: productId, price: productPrice } } }
        );
      }
    } else {
      const data = new Cart({
        user: userId,
        products: [{ productId: productId, price: productPrice }],
      });
      await data.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in addToCart:", error.message);
    res.status(500).json({ error: "An error occurred" });
  }
};

//============================= Update the quantity =================================
const updateCartQuantity = async (req, res) => {
  try {
    console.log("Update Cart Quantity Controller Called 2");
    const userId = req.session.user_id;
    const productId = req.body.id;
    const val = req.body.val;

    // Check if the product with the specified productId exists
    console.log("Product Data - productId:", productId);
    const productData = await Product.findById({ _id: productId });

    if (!productData) {
      // Product not found
      console.error("Product not found for productId:", productId);
      res.json({ result: "product_not_found" });
      return;
    }

    const cartData = await Cart.findOneAndUpdate(
      {
        user: userId,
        "products.productId": productId,
      },
      {
        $inc: {
          "products.$.quantity": val,
        },
      },
      { new: true }
    );

    if (cartData) {
      // Recalculate and update cartTotal
      const updatedCartTotal = cartData.products.reduce(
        (total, product) => total + product.quantity * product.price,
        0
      );

      await Cart.findOneAndUpdate(
        { user: userId },
        { $set: { cartTotal: updatedCartTotal } },
        { new: true }
      );

      res.json({ result: true });
    } else {
      // Handle the case when the product is not found in the cart
      console.error("Product not found in the cart for productId:", productId);
      res.json({ result: "product_not_found_in_cart" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

//removing a product from cart
const removeCartProduct = async (req, res) => {
  try {
    const productId = req.query.id;
    const userId = req.session.user_id;
    const cartData = await Cart.findOneAndUpdate(
      { user: userId },
      {
        $pull: {
          products: { productId: new mongoose.Types.ObjectId(productId) },
        },
      },
      { new: true }
    );

    if (cartData) {
      res.json({ success: true, message: "Product removed from the cart." });
    } else {
      console.log("No matching items found in the cart.");
      res.json({
        success: false,
        message: "No matching items found in the cart.",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "An error occurred while removing the product from the cart.",
    });
  }
};

module.exports = {
  loadCart,
  addToCart,
  updateCartQuantity,
  removeCartProduct,
};
