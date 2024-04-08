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

//====================================== RENDER THE CHECKOUT PAGE =============================================
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


// Place Order Function
const placeOrder = async (req, res) => {
  try {
    // Retrieve necessary data from the request
    const userId = req.session.user_id;
    const addressId = req.body.selectedAddress;
    const paymentMethod = req.body["payment-method"];
    const status = paymentMethod === "cod" ? "placed" : "pending";

    // Fetch user and address details from the database
    const user = await User.findOne({ _id: userId });
    const address = await Address.findOne({ _id: addressId });

    // Check if user or address not found
    if (!user || !address) {
      return res.status(400).json({ error: "User or address not found" });
    }

    // Fetch cart data for the user
    const cartData = await Cart.findOne({ user: userId });
    const totalAmount = cartData.total;

    // Check if cart data not found
    if (!cartData) {
      return res.status(400).json({ error: "Cart data not found" });
    }

    // Calculate discounted total for each product
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
        status: "pending", // Set the status for each product
      };
    });

    // Calculate total amount after applying the coupon
    const updatedTotalAmount = orderProducts.reduce(
      (total, product) => total + product.total,
      0
    );

    // Create a new order document
    const newOrder = new Order({
      userId: userId,
      deliveryDetails: { address: address },
      products: orderProducts,
      purchaseDate: new Date(),
      totalAmount: updatedTotalAmount, // Use the updated total amount
      status: status,
      paymentMethod: paymentMethod,
      paymentStatus: "pending", // Assuming the payment starts as pending
      shippingFee: "0",
    });

    // Save the order to the database
    const savedOrder = await newOrder.save();
    let orderid = savedOrder._id.toString();

    // Clear the user's cart
    await Cart.updateOne(
      { user: userId },
      { $set: { products: [], total: 0 } }
    );

    // Handle payment based on the selected method
    if (paymentMethod === "online") {
      // Set up options for Razorpay payment
      const options = {
        amount: updatedTotalAmount * 100, // Use the updated total amount
        currency: "INR",
        receipt: "" + orderid,
      };

      // Create Razorpay order asynchronously
      const orderPromise = new Promise((resolve, reject) => {
        razorpayInstance.orders.create(options, (err, order) => {
          if (err) {
            reject(err);
          } else {
            resolve(order);
          }
        });
      });

      // Get the Razorpay order and send it in the response
      const razorpayOrder = await orderPromise;
      return res.json({ online: true, order: newOrder, razorpayOrder });
    } else if (paymentMethod === "cod") {
      // Handle cash-on-delivery order
      return res.json({ cod: true });
    } else if (paymentMethod === "wallet") {
      console.log(paymentMethod , "guguwswdwdwwdwdd_______________")
      // Handle wallet payment option
      if (user.wallet >= updatedTotalAmount) {
       console.log(updatedTotalAmount);
        // Sufficient balance in the wallet
        
        user.wallet -= updatedTotalAmount;
        console.log(user.wallet,"________________________________")
        console.log(updatedTotalAmount,"???????????????????????????????");
        // Create a wallet history entry
        const walletHistory = {
          transactionDate: new Date(),
          transactionAmount: -updatedTotalAmount,
          transactionDetails: "Order placed",
          transactionType: "debit",
        };
console.log(walletHistory,"RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR")
        user.walletHistory.push(walletHistory);
        await user.save();
        newOrder.paymentStatus = "completed";
        await newOrder.save();
        return res.json({ order: newOrder, success: true });
      } else {
        // Insufficient balance in the wallet
        return res.json({ error: "Insufficient balance in the wallet" });
      }
    } else {
      // Invalid payment method
      return res.status(400).json({ error: "Invalid payment method" });
    }
  } catch (error) {
    // Handle any unexpected errors
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to calculate discounted total
const calculateDiscountedTotal = (totalPrice, quantity, discount) => {
  const discountedTotal = totalPrice * quantity - discount;
  return discountedTotal;
};

// Verify Payment Function
const verifyPayment = async (req, res) => {
  try {
    const user_id = req.session.user_id;

    const cartData = await Cart.findOne({ user: req.session.user_id });
    const details = req.body;
    const payment = req.body.payment;
  
    // Create HMAC using the Razorpay secret key from environment variables
    const hmac = crypto.createHmac("sha256", "f4QOCHAFThYVJH9z8lX8OPhN");
    hmac.update(details.order._id + "|" + details.payment.razorpay_payment_id);
    const hmacValue = hmac.digest("hex");


    console.log("razorpay signature :", req.body.razorpay_signature);
    if (hmacValue === req.body.razorpay_signature) {
      // Compare with the retrieved Razorpay signature
      await Order.findByIdAndUpdate(details.order.receipt, {
        $set: {
          paymentStatus: "placed",
          paymentId: details.payment.razorpay_payment_id,
        },
      });
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
};
