const admin = require("../models/adminModel");
const User = require("../models/userModel");
const Category = require("../models/categoryModel")
const Order = require("../models/orderModel");
const bcrypt = require("bcrypt"); //  line to import the 'bcrypt' module

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
    res.render("categories", { categoryList:categories }); // passing categoryData
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

const loadUsers= async (req, res) => {
  try {
    const userList = await User.find(); //finding  
    res.render("users",{userList:userList}); //and passing users
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
const editCategoryLoad= async (req, res) => {
  const categoryId = req.params.id;
  console.log(categoryId)

  try {
    const category = await Category.findById(categoryId);
    res.render("editCategory", { category:category });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
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



  console.log(coverPic,"________________________________");
  
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


//===================================== UPDATING THE ORDER STATUS  ================================================//

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, newStatus } = req.body;
    console.log("here");
    const orderStatus = await Order.updateOne(
      { _id: orderId },
      { status: newStatus }
    );
    console.log(orderStatus);
  } catch (error) {
    console.log(error.mesaage);
  }
};

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
};
