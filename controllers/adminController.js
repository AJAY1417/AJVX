const admin = require("../models/adminModel");
const User = require("../models/userModel");
const Category = require("../models/categoryModel");
const Order = require("../models/orderModel");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const excel = require("exceljs"); //  line to import the 'bcrypt' module

//=================================  ADMIN LOGIN PAGE    ============================================//

const adminLoadLogin = async (req, res) => {
  try {
    res.render("adminLogin");
  } catch (error) {
    console.log(error.message);
  }
};

const logout = (req, res) => {
  // Perform logout logic (e.g., clear session, destroy tokens, etc.)
  // ...

  // Redirect to the adminLogin page
  res.redirect("/admin/adminLogin");
};

//=================================  ADMIN VERIFY LOGIN    ============================================//
const adminVerifyLogin = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    console.log("Entered Email:", email);
    console.log("Entered Password:", password);

    const adminData = await admin.findOne({ email });

    if (adminData) {
      console.log("Retrieved Admin Data:", adminData);

      const passwordMatch = await bcrypt.compare(password, adminData.password);

      if (passwordMatch) {
        req.session.admin_id = adminData._id;
        console.log("Dashboard Redirected");
        return res.render("dashboard");
      } else {
        console.log("Password does not match");
      }
    } else {
      console.log("Admin not found with the given email");
    }

    res.render("adminLogin", { message: "Email or password is incorrect" });
    console.log("Email or password is incorrect");
  } catch (error) {
    console.error("Error:", error.message);
    res.render("adminLogin", { message: "An error occurred during login" });
  }
};

//===================================== CATEGORY PAGE RENDER  ================================================//

const loadCategories = async (req, res) => {
  try {
    const categories = await Category.find(); //fetch categories from database
    res.render("categories", { categoryList: categories }); // passing categoryData
  } catch (error) {
    console.log(error.message);
  }
};

//===================================== ADD CATEGORY PAGE RENDER  ================================================//
const loadAddCategory = async (req, res) => {
  try {
    //fetch categories from database
    res.render("addCategory"); // passing categoryData
  } catch (error) {
    console.log(error.message);
  }
};

//===================================== ADD CATEGORY  ================================================//
const addCategory = async (req, res) => {
  const { name, description } = req.body;
  const coverPic = req.file.filename;

  try {
    // Check if the category already exists
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      return res.render("addCategory", {
        status: "failed",
        message: "Category already exists",
      });
    }

    // Create and save the new category
    const newCategory = new Category({
      name,
      description,
      image: coverPic,
    });

    await newCategory.save();
    res.redirect("/admin/categories");
  } catch (error) {
    console.log(error.message);
    // Handle the error appropriately, maybe render an error page
    res.status(500).send("Internal Server Error");
  }
};

//===================================== RENDER DASHBOARD  ================================================//

const loadDashboard = async (req, res) => {
  try {
    //fetch categories from database
    res.render("dashboard"); // passing categoryData
  } catch (error) {
    console.log(error.message);
  }
};

//===================================== RENDER USER PAGE  ================================================//

const loadUsers = async (req, res) => {
  try {
    const userList = await User.find(); //finding
    res.render("users", { userList: userList }); //and passing users
  } catch (error) {
    console.log(error.message);
  }
};

//===================================== BLOCK OR UNBLOACK USERS  ================================================//

// block user or unblock user
const blockUser = async (req, res) => {
  try {
    const blockedUser = await User.findOne({ _id: req.query.id });

    if (!blockedUser) {
      return res.status(404).send("User not found");
    }

    const isBlocked = blockedUser.is_block;

    await User.updateOne(
      { _id: req.query.id },
      { $set: { is_block: !isBlocked } }
    );

    req.session.user_id = !isBlocked;
    console.log("User session updated:", req.session.user_id);

    res.redirect("/admin/users");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

//===================================== EDIT CATEGORY PAGE RENDER ================================================//

// Render the edit category page
const editCategoryLoad = async (req, res) => {
  const categoryId = req.params.id;
  console.log(categoryId);

  try {
    const category = await Category.findById(categoryId);
    res.render("editCategory", { category: category });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

//===================================== EDIT CATEGORY  ================================================//
const editCategory = async (req, res) => {
  const { _id, name, description } = req.body;

  console.log(req.body);
  let coverPic; // Declare the variable outside the conditional scope

  if (req.file) {
    coverPic = req.file.filename;
  }

  console.log(coverPic, "________________________________");

  try {
    // Construct the update object based on whether req.file exists
    const updateObject = {
      name,
      description,
    };

    if (coverPic) {
      updateObject.image = coverPic;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      _id,
      updateObject,
      { new: true }
    );

    console.log(updatedCategory);

    if (!updatedCategory) {
      console.log("Category not found");
    }

    res.redirect("/admin/categories");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

//====================  UNLIST CATEGORY =========================================================================//

const unlistCategory = async (req, res, next) => {
  try {
    const id = req.query.id;
    const category = await Category.findById(id);

    if (category) {
      category.is_block = !category.is_block;
      await category.save();
    }

    const categories = await Category.find({});
    res.redirect("/admin/categories");
  } catch (error) {
    next(error);
  }
};

//===================================== LOAD ORDER MANAGEMENT PAGE  ================================================//

const loadOrder = async (req, res) => {
  console.log("entered the function ");
  try {
    const orderDat = await Order.find({})
      .populate({
        path: "userId",
        select: "firstName",
      })
      .populate("products.product")
      .sort({ purchaseDate: -1 });

    console.log(orderDat);

    if (orderDat.length > 0) {
      res.render("orderMangement", { orderDat }); // Removed the leading slash
    } else {
      res.render("orderMangement", { orderDat: [] }); // Removed the leading slash
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }


  
};

//===================================== UPDATE ORDER STATUS  ================================================//


const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, newStatus } = req.body;
    // Update the order status and each product status within the order
    const orderUpdateResult = await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          status: newStatus, // Update the order's status
          "products.$[].status": newStatus, // Update all products' status within the order
        },
      }
    );

    if (orderUpdateResult.nModified === 0) {
      // Handle the case where the document was not modified
      return res.status(404).json({
        success: false,
        message: "Order not found or status unchanged",
      });
    }

    // Respond to the client that the update was successful
    return res.json({
      success: true,
      message: "Order and product statuses updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
//=================================================================================================//
                                        // SALES REPORT //

// const salesreportLoad = async (req, res, next) => {
//   try {
//     const formatTime = (date) => {
//       const options = {
//         hour: "numeric",
//         minute: "numeric",
//         second: "numeric",
//         timeZoneName: "short",
//       };
//       return new Intl.DateTimeFormat("en-US", options).format(date);
//     };

    // _______________________  sales report data ividen pass cheyyum ___________________________________
// const salesData = await Order.aggregate([
//   {
//     $match: {
//       $or: [
//         {
//           paymentMethod: "cod",
//           "products.status": "Delivered",
//           $and: [{ "products.status": { $nin: ["Returned", "cancelled"] } }],
//         },
//         {
//           paymentMethod: { $in: ["online", "wallet"] },
//           "products.status": { $in: ["placed", "Shipped", "Delivered"] },
//           $and: [{ "products.status": { $nin: ["Returned", "cancelled"] } }],
//         },
//       ],
//     },
//   },
//   {
//     $unwind: "$products",
//   },
//   {
//     $match: {
//       "products.status": { $nin: ["Returned", "cancelled"] },
//     },
//   },
//   {
//     $lookup: {
//       from: "products",
//       localField: "products.product",
//       foreignField: "_id",
//       as: "productDetails",
//     },
//   },
//   {
//     $lookup: {
//       from: "users",
//       localField: "userId",
//       foreignField: "_id",
//       as: "userData",
//     },
//   },
//   {
//     $project: {
//       _id: 1,
//       "userData.firstName": 1,
//       "productDetails.name": 1,
//       "productDetails.category": 1,
//       "products.total": 1,
//       "products.count": 1,
//       purchaseDate: 1,
//       paymentMethod: 1,
//       "products.status": 1,
//     },
//   },
// ]);


//     console.log("Sales Data:", salesData);

//     if (req.query.export === "csv") {
//       const excelData = salesData.map((order) => ({
//         "Order ID": order._id,
//         Username: order.userData[0]?.username || "",
//         Product: order.productDetails[0]?.product_name || "",
//         Category: order.productDetails[0]?.category || "",
//         Price: order.products.total.toFixed(2) || "",
//         Quantity: order.products.count || "",
//         "Order Date": order.orderDate.toDateString(),
//         Time: formatTime(new Date(order.orderDate)),
//         "Payment Method": order.paymentMethod || "",
//         "Order Status": order.products.status || "",
//       }));

//       const json2csvParser = new Parser();
//       const excel = json2csvParser.parse(excelData);

//       res.setHeader(
//         "Content-Type",
//         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//       );
//       res.setHeader(
//         "Content-Disposition",
//         "attachment; filename=sales-report.csv"
//       );
//       res.status(200).send(excel);
//     } else {
//       res.render("salesreport", { salesData });
//     }
//   } catch (err) {
//     next(err);
//   }
// };


const salesreportLoad = async (req, res, next) => {
  try {
    const formatTime = (date) => {
      const options = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        timeZoneName: "short",
      };
      return new Intl.DateTimeFormat("en-US", options).format(date);
    };

    const salesData = await Order.find({
      $or: [
        {
          paymentMethod: "cod",
          "products.status": "Delivered",
          $and: [{ "products.status": { $nin: ["Returned", "cancelled"] } }],
        },
        {
          paymentMethod: { $in: ["online", "wallet"] },
          "products.status": { $in: ["placed", "Shipped", "Delivered"] },
          $and: [{ "products.status": { $nin: ["Returned", "cancelled"] } }],
        },
      ],
    })
      .populate({
        path: "products.product",
        select: "name category", // Select the fields to populate
        populate: { path: "category", select: "name -_id" }, // Populate the category and select only the name
      })
      .populate("userId", "firstName"); // Populate user details


      

    if (req.query.export === "csv") {
      const excelData = salesData.map((order) => ({
        "Order ID": order._id,
        Username: order.userId.firstName || "",
        Product: order.products[0]?.product?.name || "",
        Category: order.products[0]?.product?.category || "",
        Price: order.products[0]?.total.toFixed(2) || "",
        Quantity: order.products[0]?.count || "",
        "Order Date": order.purchaseDate.toDateString(),
        Time: formatTime(new Date(order.purchaseDate)),
        "Payment Method": order.paymentMethod || "",
        "Order Status": order.products[0]?.status || "",
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
    } else {
      res.render("salesreport", { salesData });
    }
  } catch (err) {
    next(err);
  }
};

//===================================== invoice download =========================================//

// Assuming salesData is an array of sales objects
const salesData = [
    {
        _id: 1,
        userId: { firstName: 'John' },
        products: [{ product: { name: 'Product 1', category: 'Category 1' }, total: 100, count: 2, status: 'Completed' }],
        purchaseDate: new Date(),
        paymentMethod: 'Credit Card'
    },
    // Add more sales objects as needed
];

function downloadSalesDataAsExcel() {
    // Create a workbook and add a worksheet
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Sales Data');

    // Define column headers
    worksheet.columns = [
        { header: 'Order ID', key: '_id', width: 10 },
        { header: 'Username', key: 'username', width: 20 },
        { header: 'Product', key: 'productName', width: 20 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Price (INR)', key: 'price', width: 15 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Order Date', key: 'orderDate', width: 20 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        { header: 'Order Status', key: 'orderStatus', width: 15 },
    ];

    // Add sales data to the worksheet
    salesData.forEach((sale) => {
        worksheet.addRow({
            _id: sale._id,
            username: sale.userId.firstName,
            productName: sale.products[0]?.product.name || 'N/A',
            category: sale.products[0]?.product.category || 'N/A',
            price: sale.products[0]?.total.toFixed(2) || 'N/A',
            quantity: sale.products[0]?.count || 'N/A',
            orderDate: sale.purchaseDate ? sale.purchaseDate.toDateString() : 'N/A',
            paymentMethod: sale.paymentMethod || 'N/A',
            orderStatus: sale.products[0]?.status || 'N/A'
        });
    });

    // Set up file path for saving the Excel file
    const filePath = path.join(__dirname, 'sales_data.xlsx');

    // Write the workbook to a file
    workbook.xlsx.writeFile(filePath)
        .then(() => {
            console.log('Excel file created successfully.');
        })
        .catch((error) => {
            console.error('Error creating Excel file:', error);
        });
}

// Call the function to generate and download the Excel file
downloadSalesDataAsExcel();


//=================================================================================================//

//===================================== EXPORTING  ================================================//
module.exports = {
  adminLoadLogin,
  logout,
  adminVerifyLogin,
  loadDashboard,
  loadCategories,
  loadAddCategory,
  loadUsers,
  blockUser,
  addCategory,
  editCategoryLoad,
  editCategory,
  unlistCategory,
  loadOrder,
  updateOrderStatus,
  salesreportLoad,
  downloadSalesDataAsExcel,
};
