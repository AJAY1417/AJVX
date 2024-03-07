const Cart = require('../models/cartModel')
const User = require('../models/userModel')
const Product = require("../models/productModel")
const mongoose = require("mongoose");

//=========================================================================

//============================ LOAD THE CART ==============================
const loadCart = async (req, res) => {
  try {
    // console.log("Load Cart Controller Called");
    let totalSum = 0;
    let totalQuantity = 0;

    // Check if user is authenticated
    if (!req.session || !req.session.user_id) {
      // console.log("No User ID Found");
      return res.redirect("/login"); // Redirect to the login page if not logged in
    }

    const userId = req.session.user_id;
    // console.log("User ID:", userId);

    const user = await User.findById(userId);

    if (!user) {
      // console.log("User not found");
      return res.redirect("/login"); // Redirect to the login page if user not found
    }

    // Query the Cart collection using the user field
    const hasCart = await Cart.findOne({ user: userId }).populate(
      "products.productId"
    );

    // console.log("Has Cart:", hasCart);

    if (hasCart && hasCart.products) {
      // Calculate the total sum
      hasCart.products.forEach((product) => {
        product.sum = product.quantity * product.price;
        totalSum += product.sum;
        totalQuantity += product.quantity;
      });

      // Calculate data total based on product prices and counts
      let datatotal = hasCart.products.map((product) => {
        return product.price * product.quantity;
      });

      console.log("Rendering Cart Page");
      // console.log(totalQuantity);
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
      const productExistIndex = userCart.products.findIndex((product) => product.productId == productId);

      if (productExistIndex !== -1) {
        const cartProduct = userCart.products[productExistIndex];
        const { quantity } = cartProduct;

        if (productData.quantity <= quantity) {
          return res.json({ outofstock: true });
        } else {
          await Cart.updateOne({ user: userId, "products.productId": productId }, { $inc: { "products.$.quantity": 1 } });
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


//============================= Update the quanity =================================

const updateCartQuantity = async (req, res) => {
  try {
    console.log("Update Cart Quantity Controller Called 2");
    const userId = req.session.user_id;
    const productId = req.body.id;
    const val = req.body.val;

    // Check if the product with the specified productId exists
    console.log("Product Data - productId:", productId);
    const productData = await Product.findById({ _id: productId });
    // console.log("Product Data:", productData);

    if (!productData) {
      // Product not found
      console.error("Product not found for productId:", productId);
      res.json({ result: "product_not_found" });
      return;
    }

    const cartData = await Cart.findOne({
      user: userId,
      "products.productId": productId,
    });

    // console.log("Cart Data:", cartData);

    if (cartData && cartData.products) {
      const cartProduct = cartData.products.find(
        (product) => product.productId.toString() === productId.toString()
      );

      console.log("Cart Product:", cartProduct);

      if (cartProduct) {
        const currentQuantity = cartProduct.quantity;

        if (val === 1) {
          if (currentQuantity < productData.quantity) {
            await Cart.updateOne(
              { user: userId, "products.productId": productId },
              { $inc: { "products.$.quantity": 1 } }
            );
            console.log("Quantity increased");
            res.json({ result: true });
          } else {
            // Display a "stock exceeded" alert
            console.error("Stock exceeded for productId:", productId);
            res.json({ result: "stock_exceeded" });
          }
        } else if (val === -1) {
          if (currentQuantity > 1) {
            await Cart.updateOne(
              { user: userId, "products.productId": productId },
              { $inc: { "products.$.quantity": -1 } }
            );
            console.log("Quantity decreased");
            res.json({ result: true });
          } else {
            // Handle the case when the quantity is already 1
            console.error("Quantity is already 1 for productId:", productId);
            res.json({ result: "quantity_below_1" });
          }
        }
      } else {
        // Handle the case when the product is not found in the cart
        console.error(
          "Product not found in the cart for productId:",
          productId
        );
        res.json({ result: "product_not_found_in_cart" });
      }
    } else {
      // Handle the case when the cart or products array is null
      console.error("Cart or products array is null for userId:", userId);
      res.json({ result: "cart_or_products_null" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};


//removing a product from cart
const removeCartProduct = async (req, res) => {
  try {
    const productId = req.query.id; // Keep this line for GET request
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

    console.log(productId);
    console.log(cartData);

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
