const { Parser } = require("json2csv");
const Order = require("../models/orderModel");





const formatTime = (date) => {
  const options = {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
};


// =================================  SALES REPORT ============================================

const loadSalesReport = async (req, res, next) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let matchQuery = {
      $or: [
        {
          paymentOption: "COD",
          "products.orderStatus": "Delivered",
          "products.returnOrder.returnStatus": { $ne: "Refund" },
        },
        {
          paymentOption: { $in: ["Razorpay", "Wallet"] },
          "products.orderStatus": {
            $in: ["Placed", "Shipped", "Out for delivery", "Delivered"],
          },
          "products.returnOrder.returnStatus": { $ne: "Refund" },
        },
      ],
      "products.returnOrder.returnStatus": { $ne: "Refund" },
    };

    if (startDate && endDate) {
      matchQuery.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    const salesData = await Order.aggregate([
      {
        $match: matchQuery,
      },
      {
        $unwind: "$products",
      },
      {
        $match: {
          "products.returnOrder.returnStatus": { $ne: "Refund" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.productCategory",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $project: {
          _id: 1,
          orderDate: 1,
          totalAmount: 1,
          paymentOption: 1,
          "products.productId": 1,
          "products.orderStatus": 1,
          "products.quantity": 1,
          "products.price": 1,
          "productDetails.productName": 1,
          "productDetails.productCategory": 1,
          "productDetails.discountedPrice": 1,
          "categoryDetails.categoryName": 1,
          "userData.firstName": 1,
        },
      },
    ]);

    res.render("salesReport", { salesData, startDate, endDate });
  } catch (error) {
    next(error);
  }
};

const exportSalesReport = async (req, res, next) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let matchQuery = {
      $or: [
        {
          paymentOption: "COD",
          "products.orderStatus": "Delivered",
          "products.returnOrder.returnStatus": { $ne: "Refund" },
        },
        {
          paymentOption: { $in: ["Razorpay", "Wallet"] },
          "products.orderStatus": {
            $in: ["Placed", "Shipped", "Out for delivery", "Delivered"],
          },
          "products.returnOrder.returnStatus": { $ne: "Refund" },
        },
      ],
      "products.returnOrder.returnStatus": { $ne: "Refund" },
    };

    if (startDate && endDate) {
      matchQuery.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    const salesData = await Order.aggregate([
      {
        $match: matchQuery,
      },
      {
        $unwind: "$products",
      },
      {
        $match: {
          "products.returnOrder.returnStatus": { $ne: "Refund" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.productCategory",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $project: {
          _id: 1,
          orderDate: 1,
          totalAmount: 1,
          paymentOption: 1,
          "products.productId": 1,
          "products.orderStatus": 1,
          "products.quantity": 1,
          "products.price": 1,
          "productDetails.productName": 1,
          "productDetails.productCategory": 1,
          "productDetails.discountedPrice": 1,
          "categoryDetails.categoryName": 1,
          "userData.firstName": 1,
        },
      },
    ]);

    const excelData = salesData.map((order) => ({
      "Order ID": order._id,
      Username: order.userData[0]?.firstName || "",
      Product: order.productDetails[0]?.productName || "",
      Category: order.productDetails[0]?.productCategory || "",
      Price: order.products.price.toFixed(2) || "",
      Quantity: order.products.quantity || "",
      "Order Date": order.orderDate.toDateString(),
      Time: formatTime(new Date(order.orderDate)),
      "Payment Method": order.paymentOption || "",
      "Order Status": order.products.orderStatus || "",
    }));

    const json2csvParser = new Parser();
    const excel = json2csvParser.parse(excelData);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.csv"
    );
    res.status(200).send(excel);
  } catch (error) {
    next(error);
  }
};

const load500 = async (req, res, next) => {
  try {
    res.render("500");
  } catch (error) {
    next(error);
  }
};

const load404 = async (req, res, next) => {
  try {
    res.render("404");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadSalesReport,
  exportSalesReport,
  load500,
  load404,
};
