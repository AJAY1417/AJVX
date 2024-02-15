const User = require("../models/userModel");
const category = require("../models/categoryModel");
const product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Coupon = require("../models/couponModel");

//======== RENDER THE CHECKOUT PAGE ==========
const loadCheckout = async (req, res) => {
  try {
    let accountDetails;
    let userName;
    let UserAddress;
    let addressId = req.query.id;

    // Commented out coupon-related code
    const coupon = await Coupon.find({});

    if (req.session.user_id) {
      const user = await User.findOne({ _id: req.session.user_id });
      const addresses = await Address.find({ userId: req.session.user_id }); //taken from address

      if (user) {
        userName = user.name;
        accountDetails = user;
        UserAddress = addresses;
      }
    }

    const userId = req.session.user_id;
    const cartData = await Cart.findOne({ user: userId }).populate(
      "products.productId"
    );
    console.log(cartData, "Cart data is here");
    // Calculate totalSum outside the loop
    let totalSum = 0;
    let datatotal = [];
    cartData.products.forEach((product) => {
      product.sum = product.quantity * product.price;
      totalSum += product.sum;
      console.log(product.sum, "this is product sum");
      console.log(totalSum, "total calculated sum");
      datatotal.push(product.price * product.quantity); // Push datatotal values
    });

    // Update the total field in Cart model
    const updatedCart = await Cart.findOneAndUpdate(
      { user: userId }, // Use correct field name
      { $set: { total: totalSum } },
      { new: true }
    );

    console.log("----------------------", updatedCart);

    res.render("checkout", {
      userName,
      accountDetails,
      UserAddress,
      datatotal,
      totalSum,
      cartData,

      coupon,
      //   discAmount,
    });
  } catch (error) {
    console.log(error.message);
  }
};

//===================== REMOVE PRODUCT FROM CART ==========================
const removeCartProduct = async (req, res) => {
  try {
    const productId = req.query.id;
    const userId = req.session.user_id;

    // Remove the product from the cart
    const cart = await Cart.findOne({ userid: userId });
    const updatedCart = await Cart.findOneAndUpdate(
      { userid: userId },
      {
        $pull: {
          products: {
            productId: productId,
          },
        },
      },
      { new: true }
    );

    // Calculate new total sum
    let totalSum = 0;
    updatedCart.products.forEach((product) => {
      totalSum += product.count * product.price;
    });

    // Update the total sum in the cart
    await Cart.findOneAndUpdate(
      { userid: userId },
      { $set: { total: totalSum } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false });
  }
};



//===================== PLACE ORDER  ==========================

//===================== PLACE ORDER ==========================
const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const addressId = req.body.selectedAddress;
    const paymentMethod = req.body["payment-method"];
    const status = paymentMethod === "cod" ? "placed" : "pending";

    const user = await User.findOne({ _id: userId });
    const address = await Address.findOne({ _id: addressId });

    if (!user || !address) {
      console.log("User or address not found");
      return res.status(400).json({ error: "User or address not found" });
    }

    const cartData = await Cart.findOne({ user: userId });

    if (!cartData) {
      console.log("Cart data not found");
      return res.status(400).json({ error: "Cart data not found" });
    }
     console.log("Cart Data:", cartData); 

    const totalAmount = cartData.total;
    const orderProducts = [];

    for (const cartProduct of cartData.products) {
      orderProducts.push({
        product: cartProduct.productId,
        count: cartProduct.count,
        total: cartProduct.totalPrice,
      });
    }

    const newOrder = new Order({
      userId: userId,
      deliveryDetails: { address: address },
      products: orderProducts,
      purchaseDate: new Date(),
      totalAmount: totalAmount,
      status: status,
      paymentMethod: paymentMethod,
      paymentStatus: "paid",
      shippingFee: "0",
    });

    const savedOrder = await newOrder.save();

    // Clear the user's cart
    await Cart.updateOne({ user: userId }, { $set: { products: [] } });

    if (paymentMethod === "online") {
      const options = {
        amount: totalAmount * 100,
        currency: "INR",
        receipt: savedOrder._id.toString(),
      };

      razorpayInstance.orders.create(options, function (err, order) {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'Razorpay order creation failed' });
        }

        return res.json({ order });
      });
    } else if (paymentMethod === "cod") {
      console.log("COD order placed");

      await Cart.deleteOne({ user: userId });
      return res.json({ success: true });
    } else {
      console.log("Invalid payment method");
      return res.status(400).json({ error: "Invalid payment method" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};








//===================== RENDER SUCCESS PAGE ==========================


// order placed success page
const orderSuccess = async (req, res) => {
  try {
    const userId = req.session.user_id;
    console.log(userId);

    console.log('Order placed successfully');
    res.render('orderSuccess');
  } catch (error) {
    console.log(error.message);
    res.render('500')
  }
};

//===================== SHOW CANCEL ORDER PAGE ==========================
const OrderCancelPage = async (req, res) => {
  try {
    res.render("orderCancel");
  } catch (error) {
    console.log(error.message);
    res.render("500");
  }
};

//===================== CANCEL ORDER ==========================
const cancelOrder = async (req, res) => {
  try {
    console.log("Cancel order route accessed");
    const type = req.body.type;
    const id = req.body.id;

    if (type === "order") {
      const order = await Order.findOne({ _id: id });

      if (order) {
        order.status = "cancelled";
        order.notes = "REASON FOR CANCEL :" + req.body.reason;
        await order.save();

        for (const orderProduct of order.products) {
          const proDB = await product.findOne({ _id: orderProduct.product });
          
          if (proDB) {
            proDB.quantity += orderProduct.count;
            await proDB.save();
          }
        }

        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Order not found" });
      }
    } else {
      res.status(400).json({ error: "Invalid request type" });
    }
  } catch (error) {
    console.log(error.message);
  }
};









module.exports = {
  loadCheckout,
  removeCartProduct,
  orderSuccess,
  placeOrder,
  OrderCancelPage,
  cancelOrder
};
