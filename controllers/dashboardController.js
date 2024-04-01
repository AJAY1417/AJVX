const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");

const loadDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();

    const totalRevenueResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalRevenue =
      totalRevenueResult.length > 0 ? totalRevenueResult[0].totalRevenue : 0;

    const averageOrderValue =
      totalOrders !== 0 ? totalRevenue / totalOrders : 0;

    const allProducts = await Product.find({}, "productName");

    const revenuePerProduct = await Order.aggregate([
      {
        $unwind: "$products",
      },
      {
        $match: {
          $or: [
            { paymentOption: "COD", "products.orderStatus": "Delivered" },
            {
              paymentOption: { $in: ["Razorpay", "Wallet"] },
              "products.orderStatus": {
                $in: ["Placed", "Shipped", "Out for delivery", "Delivered"],
              },
            },
          ],
          "products.returnOrder.returnStatus": { $ne: "Refund" },
        },
      },
      {
        $group: {
          _id: "$products.productId",
          totalAmount: {
            $sum: { $multiply: ["$products.price", "$products.quantity"] },
          },
        },
      },
    ]);

    const productIds = revenuePerProduct.map((product) => product._id);

    const productMap = new Map(
      allProducts.map((product) => [product._id.toString(), product])
    );

    const productData = allProducts.map((product) => {
      const revenueProduct = revenuePerProduct.find(
        (rp) => rp._id.toString() === product._id.toString()
      );
      return {
        name: product.productName,
        revenue: revenueProduct ? revenueProduct.totalAmount : 0,
      };
    });

    const sortedProducts = productData.sort((a, b) => b.revenue - a.revenue);

    const top3Products = sortedProducts.slice(0, 3);

    const productLabels = top3Products.map((product) => product.name);
    const productRevenues = top3Products.map((product) => product.revenue);

    const revenuePerCategory = await Order.aggregate([
      {
        $unwind: "$products",
      },
      {
        $match: {
          $or: [
            { paymentOption: "COD", "products.orderStatus": "Delivered" },
            {
              paymentOption: { $in: ["Razorpay", "Wallet"] },
              "products.orderStatus": {
                $in: ["Placed", "Shipped", "Out for delivery", "Delivered"],
              },
            },
          ],
          "products.returnOrder.returnStatus": { $ne: "Refund" },
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
        $unwind: "$productDetails",
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
        $unwind: "$categoryDetails",
      },
      {
        $group: {
          _id: "$categoryDetails.categoryName",
          totalAmount: {
            $sum: { $multiply: ["$products.price", "$products.quantity"] },
          },
        },
      },
    ]);

    const allCategories = await Category.find({}, "categoryName");

    const categoryData = allCategories.map((category) => ({
      name: category.categoryName,
      revenue:
        revenuePerCategory.find((c) => c._id === category.categoryName)
          ?.totalAmount || 0,
    }));

    const sortedCategories = categoryData.sort((a, b) => b.revenue - a.revenue);

    const top3Categories = sortedCategories.slice(0, 3);

    const categoryLabels = top3Categories.map((category) => category.name);
    const categoryRevenues = top3Categories.map((category) => category.revenue);

    res.render("dashboard", {
      totalUsers,
      totalOrders,
      totalRevenue,
      averageOrderValue,
      productLabels,
      productRevenues,
      categoryLabels,
      categoryRevenues,
      top3Categories,
      top3Products,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadDashboard,
};
