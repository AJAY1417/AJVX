const Order = require("../models/orderModel");
const User = require("../models/userModel");

exports.generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orderData = await Order.findById(orderId).populate(
      "products.product"
    );

    if (!orderData) {
      return res.status(404).send("Order not found");
    }

    const userId = req.session.user_id;
    const userData = await User.findById(userId).populate("addresses");
    const date = new Date();
    const data = {
      orderData: orderData,
      userData: userData,
      date: date,
    };

    res.render("invoice", { orderData, userData, date });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
