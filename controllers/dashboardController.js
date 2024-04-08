const User = require("../models/userModel");
const Order = require("../models/orderModel");


// ____________________________________________________________________________________________________________________________________


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

    const dailyRevenue = await getDailyRevenueData(); // This line fetches the daily revenue data


    
    res.render("dashboard", {
      totalUsers,
      totalOrders,
      totalRevenue,
      averageOrderValue,
      revenueData: JSON.stringify({
        daily: dailyRevenue,
        // Include other revenue data if needed here, make sure they are retrieved above like dailyRevenueData
        // weekly: await getWeeklyRevenueData(),
        // monthly: await getMonthlyRevenueData(),
        // yearly: await getYearlyRevenueData(),
      }),
    });
  } catch (error) {
    next(error);
  }
};

// ____________________________________________________________________________________________________________________________________

const getRevenueData = async (req, res, next) => {
  try {
    const interval = req.params.interval; // Get interval from query parameters

    let revenueData = [];

    if (interval === "daily") {
      revenueData = await getDailyRevenueData();
    } else if (interval === "weekly") {
      revenueData = await getWeeklyRevenueData();
    } else if (interval === "monthly") {
      revenueData = await getMonthlyRevenueData();
    } else if (interval === "custom") {
    
    }

    res.json({ revenueData }); 
  } catch (error) {
    next(error);
  }
};

              //------------------------------------------//
async function getDailyRevenueData() {
  try {
   const sevenDaysAgo = new Date();
   sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // Calculate date 7 days ago

   const dailyRevenue = await Order.aggregate([
     {
       $match: {
         purchaseDate: { $gte: sevenDaysAgo }, // Filter orders from the last 7 days
       },
     },
     {
       $group: {
         _id: { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } },
         totalIncome: { $sum: "$totalAmount" },
       },
     },
     {
       $sort: { _id: 1 }, 
     },
   ]);
    console.log(dailyRevenue,"___________this isdaily revenue");
    return dailyRevenue;
  } catch (error) {
    console.error("Error fetching daily revenue data:", error);
    throw error;
  }
}
              //------------------------------------------//

async function getWeeklyRevenueData() {
  try {
    const weeklyRevenue = await Order.aggregate([
      {
        $group: {
          _id: { $isoWeek: "$purchaseDate" },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);
    console.log(weeklyRevenue,"___________ughkghukhuk")
    return weeklyRevenue;
  } catch (error) {
    console.error("Error fetching weekly revenue data:", error);
    throw error;
  }
}

                            //------------------------------------------//

async function getMonthlyRevenueData() {
  try {
    const monthlyRevenue = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$purchaseDate" } },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: -1 }
      },
      {
        $limit: 8
      }
    ]);
    return monthlyRevenue.reverse();
  } catch (error) {
    console.error("Error fetching monthly revenue data:", error);
    throw error;
  }
}

             //------------------------------------------//
async function getYearlyRevenueData() {
  try {
    const yearlyRevenue = await Order.aggregate([
      {
        $group: {
          _id: { $year: "$purchaseDate" },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: -1 }
      },
      {
        $limit: 8
      }
    ]);
    return yearlyRevenue.reverse();
  } catch (error) {
    console.error("Error fetching yearly revenue data:", error);
    throw error;
  }
}


// _________________________________________________      EXPORTS    _______________________________________________________________________
module.exports = {
  loadDashboard,
  getRevenueData,
  getDailyRevenueData,
  getWeeklyRevenueData,
  getMonthlyRevenueData,
  getYearlyRevenueData,
};
