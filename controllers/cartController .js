const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const mongoose = require("mongoose");
const Wishlist = require("../models/wishlistModel");
const offers = require("../models/productOfferModel");
const category = require("../models/categoryOfferModel");
//=========================================================================

//============================ LOAD THE CART ==============================

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


const addToCart = async (req, res) => {
  try {
    const { id: productId } = req.body;
    const userId = req.session.user_id;

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

    // Determine the product price with discount
    let productPrice = productData.price;
    const discountPrices = [
      productData.discountPricepro,
      productData.discountPricecat,
    ].filter((discount) => discount !== null && discount !== undefined);
    const smallestDiscount = discountPrices.length
      ? Math.min(...discountPrices)
      : undefined;
    if (smallestDiscount !== undefined) {
      productPrice = smallestDiscount;
    }

    const userCart = await Cart.findOne({ user: userId });

    if (userCart) {
      const productExistIndex = userCart.products.findIndex(
        (product) => product.productId.toString() === productId
      );

      if (productExistIndex !== -1) {
        const cartProduct = userCart.products[productExistIndex];
        const { quantity } = cartProduct;

        if (productData.quantity <= quantity) {
          return res.json({ outofstock: true });
        } else {
          await Cart.updateOne(
            { user: userId, "products.productId": productId },
            {
              $inc: { "products.$.quantity": 1 },
              "products.$.price": productPrice,
            } // Update price if necessary
          );
        }
      } else {
        await Cart.updateOne(
          { user: userId },
          {
            $push: {
              products: {
                productId: productId,
                price: productPrice,
              },
            },
          }
        );
      }
    } else {
      const data = new Cart({
        user: userId,
        products: [{ productId: productId, price: productPrice }],
      });
      await data.save();
    }

    // Remove the product from the wishlist
    await Wishlist.updateOne(
      { userId: userId },
      { $pull: { productid: productId } }
    );

    res.json({ success: true });
    
  } catch (error) {
    console.error("Error in addToCart:", error.message);
    res.status(500).json({ error: "An error occurred" });
  }
};


const cartCount =  async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.json({ count: 0 });
    }

    const userId = req.session.user_id;
    const cart = await Cart.findOne({ user: userId });
    const count = cart ? cart.products.length : 0;

    res.json({ count: count });
  } catch (error) {
    console.error('Error fetching cart count:', error);
    res.status(500).json({ error: 'Error fetching cart count' });
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
      // Product not found0
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
      // Check if the updated quantity is less than 1, set it to 1
      if (cartData.products[0].quantity < 1) {
        cartData.products[0].quantity = 1;
        await cartData.save();
        res.json({ result: "quantity_below_1" });
        return;
      }

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

//________________________________ REMOVE THE CART PRODUCTS HERE ___________________________________________________
const removeCartProduct = async (req, res) => {
  try {
    const productId = req.query.id;
    const userId = req.session.user_id;

    // Remove the product from the cart
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
      // Product successfully removed from the cart
      res.json({ success: true, message: "Product removed from the cart." });
    } else {
      // No matching items found in the cart
      console.log("No matching items found in the cart.");
      res.json({
        success: false,
        message: "No matching items found in the cart.",
      });
    }

    // No need to add the product back to the wishlist here
    // If you're facing issues with products being re-added to the wishlist,
    // make sure you're not inadvertently calling the addtoWishlist function from elsewhere.
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "An error occurred while removing the product from the cart.",
    });
  }
};

//____________________________________________________________________________________________________________________________________________________________________

module.exports = {
  loadCart,
  addToCart,
  cartCount,
  updateCartQuantity,
  removeCartProduct,
};
