const User = require("../models/userModel");
const category = require("../models/categoryModel");
const product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Coupon = require("../models/couponModel");
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();

//================================================================================================================

//================================== RAZORPAY INSTANCE ==========================================
const razorpayInstance = new Razorpay({
  key_id: "rzp_test_Rr5LK4XJjm8rxm",
  key_secret: "f4QOCHAFThYVJH9z8lX8OPhN",
});

const loadCheckout = async (req, res) => {
  try {
    let accountDetails;
    let userName;
    let UserAddress;
    let addressId = req.query.id;

    const coupon = await Coupon.find({});

    if (req.session.user_id) {
      const user = await User.findOne({ _id: req.session.user_id });
      const addresses = await Address.find({ userId: req.session.user_id });

      if (user) {
        userName = user.firstName;
        accountDetails = user;
        UserAddress = addresses;
      }
    }

    const userId = req.session.user_id;
    const cartData = await Cart.findOne({ user: userId }).populate(
      "products.productId"
    );
    console.log(cartData, "Cart data is here");

    let totalSum = 0;
    let datatotal = [];
    let isQuantityAvailable = true;

    for (const product of cartData.products) {
      // Check if product quantity is available
      if (product.quantity > product.productId.quantity) {
        isQuantityAvailable = false;
        break; 
      }

      product.sum = product.quantity * product.price;
      totalSum += product.sum;
      console.log(product.sum, "this is product sum");
      console.log(totalSum, "total calculated sum");
      datatotal.push(product.price * product.quantity); // Push datatotal values
    }

    let updatedCart;
    if (isQuantityAvailable) {
      updatedCart = await Cart.findOneAndUpdate(
        { user: userId },
        { $set: { total: totalSum } },
        { new: true }
      );
    }

    console.log("----------------------", updatedCart);

    res.render("checkout", {
      userName,
      accountDetails,
      UserAddress,
      datatotal,
      totalSum,
      cartData,
      coupon,
      isQuantityAvailable, // Pass isQuantityAvailable to frontend
    });
  } catch (error) {
    console.log(error.message);
  }
};

//============================================== REMOVE PRODUCT FROM CART ========================================================
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





//_____________________________________________________________
const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const addressId = req.body.selectedAddress;
    const paymentMethod = req.body["payment-method"];
    const orderId = req.body.orderId;

    // Check if this is a retry payment
    let order;
    if (orderId) {
      order = await Order.findOne({
        _id: orderId,
        userId: userId,
        status: "Payment Failed",
      });
      if (!order) {
        return res
          .status(400)
          .json({ error: "Invalid order or order cannot be retried" });
      }
    }

    const [user, address, cartData] = await Promise.all([
      User.findOne({ _id: userId }),
      Address.findOne({ _id: addressId }),
      Cart.findOne({ user: userId }),
    ]);

    if (!user || !address || !cartData) {
      return res
        .status(400)
        .json({ error: "User, address, or cart data not found" });
    }

    // Create new order if not a retry
    if (!order) {
      const orderProducts = cartData.products.map((cartProduct) => {
        const discount = req.body.discountAmt || 0;
        const discountedTotal = calculateDiscountedTotal(
          cartProduct.price,
          cartProduct.quantity,
          discount
        );
        return {
          product: cartProduct.productId,
          count: cartProduct.quantity,
          total: discountedTotal,
          productPrice: cartProduct.price,
          status: "pending",
        };
      });

      const updatedTotalAmount = orderProducts.reduce(
        (total, product) => total + product.total,
        0
      );

      order = new Order({
        userId: userId,
        deliveryDetails: { address: address },
        products: orderProducts,
        purchaseDate: new Date(),
        totalAmount: updatedTotalAmount,
        status: paymentMethod === "cod" ? "placed" : "pending",
        paymentMethod: paymentMethod,
        paymentStatus: "pending",
        shippingFee: "0",
      });

      await order.save();
      await Cart.updateOne(
        { user: userId },
        { $set: { products: [], total: 0 } }
      );
    }

    if (paymentMethod === "online") {
      const options = {
        amount: order.totalAmount * 100,
        currency: "INR",
        receipt: order._id.toString(),
      };

      try {
        const razorpayOrder = await new Promise((resolve, reject) => {
          razorpayInstance.orders.create(options, (err, order) => {
            if (err) {
              reject(err);
            } else {
              resolve(order);
            }
          });
        });

        return res.json({ online: true, order, razorpayOrder });
      } catch (paymentError) {
        console.error("Payment failed:", paymentError);

        // Update order status to Payment Failed
        await order.updateOne({ status: "Payment Failed" });

        // Provide repay link with 24-hour expiry
        const repayLink = `/repay/${order._id}`;

        return res.json({
          error: "Payment Failed",
          repayLink,
          message: "You have 24 hours to repay.",
        });
      }
    } else if (paymentMethod === "cod") {
      if (order.totalAmount >= 1000) {
        return res.json({
          error: "COD Limit Exceeded",
          totalAmount: order.totalAmount,
        });
      } else {
        return res.json({ cod: true });
      }
    } else if (paymentMethod === "wallet") {
      if (user.wallet >= order.totalAmount) {
        user.wallet -= order.totalAmount;
        const walletHistory = {
          transactionDate: new Date(),
          transactionAmount: -order.totalAmount,
          transactionDetails: "Order placed",
          transactionType: "debit",
        };
        user.walletHistory.push(walletHistory);
        await Promise.all([
          user.save(),
          order.updateOne({ paymentStatus: "completed" }),
        ]);
        return res.json({ order, success: true });
      } else {
        return res.json({ error: "Insufficient balance in the wallet" });
      }
    } else {
      return res.status(400).json({ error: "Invalid payment method" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



const calculateDiscountedTotal = (totalPrice, quantity, discount) => {
  const discountedTotal = totalPrice * quantity - discount;
  return discountedTotal;
};
//================================================================================================================
// Verify Payment Function
const verifyPayment = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const cartData = await Cart.findOne({ user: req.session.user_id });
    const details = req.body;
    const payment = req.body.payment;

    const hmac = crypto.createHmac("sha256", "f4QOCHAFThYVJH9z8lX8OPhN");
    hmac.update(details.order._id + "|" + details.payment.razorpay_payment_id);
    const hmacValue = hmac.digest("hex");
console.log("hmacValue :",hmacValue)
    console.log("razorpay signature :", req.body.razorpay_signature);
    if (hmacValue ===hmacValue) {
     
      await Order.findByIdAndUpdate(details.order.receipt, {
        $set: {
          paymentStatus: "placed",
          paymentId: details.payment.razorpay_payment_id,
        },
      });

      for (const product of cartData.products) {
        await product.findByIdAndUpdate(product.productId, {
          $inc: { quantity: -product.quantity },
        });
      }

     
      await Cart.deleteOne({ user: user_id });

      return res.json({ placed: true });
    }
  } catch (error) {
    console.log("Error in verifyPayment:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};



//===================== RENDER ORDER SUCCESS PAGE ==========================

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
        order.notes = "REASON FOR CANCEL: " + req.body.reason;
        await order.save();

        for (const orderProduct of order.products) {
          const proDB = await product.findOne({ _id: orderProduct.product });

          if (proDB) {
            proDB.quantity += orderProduct.count;
            await proDB.save();
          }
        }

        // Find the user associated with the cancelled order
        const user = await User.findOne({ _id: order.userId });
        if (user) {
          // Add wallet history
          const walletHistory = {
            transactionDate: new Date(),
            transactionAmount: order.totalAmount,
            transactionDetails: `Refund for cancelled order (${order._id})`,
            transactionType: "credit",
          };
          user.walletHistory.push(walletHistory);
          user.wallet += order.totalAmount
          await user.save();
        } else {
          console.error("User not found while cancelling order");
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
    res.status(500).json({ error: "Internal server error" });
  }
};



//========================== LOAD RETURN ORDER PAGE ==========================

const returnOrder = async (req, res) => { 
  try {
    res.render('orderReturn')
  } catch (error) {
    console.log(error.message)
    res.render('500')
  }
}

//========================== RETURN ORDER ====================================================

const orderReturnPOST = async (req, res) => {
  console.log("Started the return function ");
  try {
    const type = req.body.type;
    const id = req.body.id;
   

    if (type === "order") {
      // Handle order return
      const order = await Order.findOne({ _id: id });
      const user = order.userId;
       console.log(order, "______________");
       
  console.log(user, "____+++++++++__________");

      if (order) {
        order.status = "Returned";
        await order.save();

        // Calculate refund amount and update user's wallet
        const refundAmount = order.totalAmount;
        const userWallet = await User.findOneAndUpdate(
          { _id: user },
          { $inc: { wallet: refundAmount } },
          { new: true }
        );

        // Log transaction in user's wallet history
        userWallet.walletHistory.push({
          transactionDate: new Date(),
          transactionDetails: "Order returned",
          transactionType: "credit",
          transactionAmount: refundAmount,
        });
        await userWallet.save();

        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Order not found" });
      }
    } else {
      res.status(400).json({ error: "Invalid request type" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//========================= REPAY PAYMENT FAILED ==========================

const repayOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if the order is within the 24-hour repayment window
    const currentTime = new Date();
    const paymentFailedTime = new Date(order.updatedAt); // Assuming updatedAt is set when the order status changes to "Payment Failed"
    const timeDifference = (currentTime - paymentFailedTime) / (1000 * 60 * 60); // Difference in hours

    if (timeDifference > 24) {
      return res.status(400).json({ error: "Repayment window has expired" });
    }

    // Generate new Razorpay order for repayment
    const options = {
      amount: order.totalAmount * 100,
      currency: "INR",
      receipt: orderId,
    };

    const razorpayOrder = await new Promise((resolve, reject) => {
      razorpayInstance.orders.create(options, (err, order) => {
        if (err) {
          reject(err);
        } else {
          resolve(order);
        }
      });
    });

    return res.json({ razorpayOrder });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};




module.exports = {
  loadCheckout,
  removeCartProduct,
  orderSuccess,
  placeOrder,
  OrderCancelPage,
  cancelOrder,
  verifyPayment,
  returnOrder,
  orderReturnPOST,
  repayOrder
};
