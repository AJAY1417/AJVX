// Import required models
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");

//__________________________________________________________________________________________________________________________//

const loadDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    // ---------------------------- //

    const totalRevenueResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);
    // ---------------------------- //
    let totalRevenue = 0;
    totalRevenue =
      totalRevenueResult.length > 0 ? totalRevenueResult[0].totalRevenue : 0;

    const averageOrderValue =
      totalOrders !== 0 ? totalRevenue / totalOrders : 0;

    const dailyRevenue = await Order.getDailyRevenueData();
    // ---------------------------- //
    const paymentMethodsData = await Order.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
        },
      },
    ]);
    const paymentMethodsLabels = paymentMethodsData.map((method) => method._id);
    const paymentMethodsCount = paymentMethodsData.map(
      (method) => method.count
    );
    // ---------------------------- //
    // Revenue per product
    const revenuePerProduct = await Order.aggregate([
      {
        $unwind: "$products",
      },
      {
        $match: {
          $or: [
            { paymentMethod: "cod", "products.status": "Delivered" },
            {
              paymentMethod: { $in: ["online", "Wallet"] },
              "products.status": {
                $in: ["Placed", "Shipped", "Pending", "Delivered"],
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $group: {
          _id: "$productDetails._id",
          totalAmount: { $sum: "$products.total" },
          productName: { $first: "$productDetails.name" },
        },
      },
    ]);

    

    // All products
    const allProducts = await Product.find({}, "name");

    // Combine products and revenue data
    const productData = allProducts.map((product) => {
      const revenueProduct = revenuePerProduct.find(
        (rp) => rp._id.toString() === product._id.toString()
      );
      return {
        name: product.name,
        revenue: revenueProduct ? revenueProduct.totalAmount : 0, // Handle missing revenue data
      };
    });

    // Top 3 products
    const sortedProducts = productData.sort((a, b) => b.revenue - a.revenue);
    const top3Products = sortedProducts.slice(0, 3);

    const productLabels = top3Products.map((product) => product.name); //main data
    const productRevenues = top3Products.map((product) => product.revenue); //main data

    // ---------------------------- //

    // Revenue per category
    const revenuePerCategory = await Order.aggregate([
      {
        $unwind: "$products",
      },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $group: {
          _id: "$productDetails.category",
          totalAmount: { $sum: "$products.total" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: "$categoryDetails",
      },
      {
        $project: {
          name: "$categoryDetails.name",
          description: "$categoryDetails.description",
          totalAmount: 1,
        },
      },
    ]);

    console.log(revenuePerCategory, "revenuePerCategory");

    // All categories
    const allCategories = await Category.find({}, "name");
    console.log(allCategories, "allCategories");

    const categoryData = allCategories.map((category) => ({
      name: category.name,
      revenue:
        revenuePerCategory.find((c) => c._id.equals(category._id))
          ?.totalAmount || 0,
    }));
    console.log(categoryData, "categoryData ");

    const sortedCategories = categoryData.sort((a, b) => b.revenue - a.revenue);
    console.log(sortedCategories, "sortedCategories ");

    const top4Categories = sortedCategories.slice(0, 4);
    console.log(top4Categories, "top4Categories ");

    const categoryLabels = top4Categories.map((category) => category.name);
    console.log(categoryLabels, "categoryLabels ");

    const categoryRevenues = top4Categories.map((category) => category.revenue);
    console.log(categoryRevenues, "categoryRevenues ");

    // ---------------------------- //

    const today = new Date();
    const lastWeekStartDate = new Date(today);
    lastWeekStartDate.setDate(today.getDate() - 7);

    const ordersInDateRange = await Order.find({
      orderDate: { $gte: lastWeekStartDate, $lte: today },
    });
    // ---------------------------- //
    // Weekly revenue
    const weeklyRevenueOrders = await Order.aggregate([
      {
        $match: {
          purchaseDate: { $gte: lastWeekStartDate, $lte: today },
          $or: [
            { paymentMethod: "cod", "products.status": "Delivered" },
            {
              paymentMethod: { $in: ["online", "Wallet"] },
              "products.status": {
                $in: ["placed", "Shipped", "Delivered", "pending"],
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    console.log("Weekly Revenue Orders: ", weeklyRevenueOrders);

    console.log("wwwwww", weeklyRevenueOrders);
    // ---------------------------- //

    // Weekly revenue chart data
    const allDaysOfLastWeek = [];
    let currentDate = new Date(lastWeekStartDate);
    while (currentDate <= today) {
      allDaysOfLastWeek.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const formattedWeeklyRevenueChartData = allDaysOfLastWeek.map((day) => {
      const matchingEntry = weeklyRevenueOrders.find(
        (entry) => entry._id === day
      );
      return {
        date: day,
        amount: matchingEntry ? matchingEntry.totalAmount : 0,
      };
    });

    const weeklyRevenueLabels = formattedWeeklyRevenueChartData.map(
      (entry) => entry.date
    );

    const weeklyRevenueData = formattedWeeklyRevenueChartData.map(
      (entry) => entry.amount
    );

    // ---------------------------- //
    // Monthly revenue
    const monthlyRevenueOrders = await Order.aggregate([
      {
        $match: {
          purchaseDate: {
            $gte: new Date(today.getFullYear(), 1, 1), // Start from February 1st
            $lte: today,
          },
          $or: [
            { paymentMethod: "cod", "products.status": "Delivered" },
            {
              paymentMethod: { $in: ["online", "Wallet"] },
              "products.status": {
                $in: ["placed", "Shipped", "pending", "Delivered"],
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$purchaseDate" } },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    console.log("Monthly Revenue Orders: ", monthlyRevenueOrders);

    // Monthly revenue chart data
    // ... (Other parts of your code)

    // Monthly revenue chart data
    const allMonths = [];
    let currentMonthDate = new Date(today.getFullYear(), 2, 2); // Start from February 1st
    while (
      currentMonthDate.getFullYear() <= today.getFullYear() &&
      currentMonthDate.getMonth() <= today.getMonth()
    ) {
      // Changed to '<='
      allMonths.push(
        currentMonthDate.toISOString().split("T")[0].substring(0, 7)
      ); // Format as "YYYY-MM"
      currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    }

    // ... (Rest of your code)
    const formattedMonthlyRevenueChartData = allMonths.map((month) => {
      const matchingMonthEntry = monthlyRevenueOrders.find(
        (entry) => entry._id.toString() === month
      );

      return {
        month: month,
        amount: matchingMonthEntry ? matchingMonthEntry.totalAmount : 0,
      };
    });

    console.log(
      formattedMonthlyRevenueChartData,
      "formattedMonthlyRevenueChartData"
    );
    const monthlyRevenueLabels = formattedMonthlyRevenueChartData.map(
      (entry) => entry.month
    );
    const monthlyRevenueData = formattedMonthlyRevenueChartData.map(
      (entry) => entry.amount
    );
    console.log(monthlyRevenueData, "monthlyRevenueData");

    //=============================================//

    // Yearly revenue
    const yearlyRevenueOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$purchaseDate" } },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const allYearsFiveYears = [];
    let currentYearDateFiveYears = new Date(today.getFullYear() - 5, 0, 1); // Go back five years from January
    while (currentYearDateFiveYears.getFullYear() <= today.getFullYear()) {
      allYearsFiveYears.push(
        currentYearDateFiveYears.toISOString().split("T")[0].substring(0, 4)
      ); // Format as "YYYY"
      currentYearDateFiveYears.setFullYear(
        currentYearDateFiveYears.getFullYear() + 1
      );
    }
    // ---------------------------- //

    const fiveYearsRevenueOrders = await Order.aggregate([
      {
        $match: {
          purchaseDate: { $lte: today },
          $or: [
            { paymentMethod: "cod", "products.status": "Delivered" },
            {
              paymentMethod: { $in: ["Razorpay", "Wallet"] },
              "products.status": {
                $in: ["Placed", "Shipped", "pending", "Delivered"],
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$purchaseDate" } },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    // ---------------------------- //

    const formattedFiveYearsRevenueChartData = allYearsFiveYears.map((year) => {
      const matchingYearEntry = yearlyRevenueOrders.find(
        (entry) => entry._id === year
      );
      return {
        year: year,
        amount: matchingYearEntry ? matchingYearEntry.totalAmount : 0,
      };
    });
    // ---------------------------- //
    const currentYear = today.toISOString().split("T")[0].substring(0, 4);
    const currentYearRevenue = yearlyRevenueOrders.reduce((total, entry) => {
      if (entry._id === currentYear) {
        total += entry.totalAmount;
      }
      return total;
    }, 0);
    // ---------------------------- //

    formattedFiveYearsRevenueChartData.push({
      year: currentYear,
      amount: currentYearRevenue,
    });

    const yearlyRevenueLabels = formattedFiveYearsRevenueChartData.map(
      (entry) => entry.year
    );
    const yearlyRevenueData = formattedFiveYearsRevenueChartData.map(
      (entry) => entry.amount
    );
    console.log("yearlyRevenueData", yearlyRevenueData);
    console.log(
      "productLabels :",
      productLabels,
      productRevenues,
      sortedProducts,
      top3Products
    );
    console.log(revenuePerProduct);
    // ____________________________________________________________________________________________________________________________

    res.render("dashboard", {
      totalUsers,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      dailyRevenue,
      revenuePerProduct,
      allProducts,
      revenuePerCategory,
      allCategories,
      yearlyRevenueOrders,
      yearlyRevenueLabels,
      yearlyRevenueData,
      formattedWeeklyRevenueChartData,
      monthlyRevenueLabels,
      monthlyRevenueData,
      weeklyRevenueLabels,
      weeklyRevenueData,
      fiveYearsRevenueOrders,
      productLabels,
      productRevenues,
      categoryLabels,
      categoryRevenues,
      paymentMethodsLabels,
      paymentMethodsCount,
      // currentMonthRevenue,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadDashboard,
};
