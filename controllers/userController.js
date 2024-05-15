const User = require("../models/userModel");
const Product = require("../models/productModel");
const categorySchema = require("../models/categoryModel");
const Wishlist = require("../models/wishlistModel");
const bcrypt = require("bcrypt");
const config = require("../config/config");
const Offers = require("../models/productOfferModel");
const categoryOffer = require("../models/categoryOfferModel");
const randomString = require("randomstring");

const nodemailer = require("nodemailer");

// ============================  OTP GENERATION  =======================================
const generateRandomNumericString = (length) => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============================  PASSWORD SECURING USING BCRYPT =======================================
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
    throw error; // Make sure to propagate the error to the calling function
  }
};

// ============================ HOMEPAGE RENDERING =======================================
const loadHome = async (req, res) => {
  try {
    const products = await Product.find().populate("category").exec();
    // Pass the user information to the template
    res.render("home", { products: products });
  } catch (error) {
    console.log(error.message);
    // Handle errors appropriately
    res.status(500).send("Internal Server Error");
  }
};

// ============================  REFERAL CODE GENERATOR  =======================================
function generateReferalCode() {
  const Rcode = randomString.generate({
    length: 8,
  });
  return User.findOne({ referralCode: Rcode }).then((existingRefer) => {
    if (existingRefer) {
      return generateReferalCode(); // Call generateReferalCode() recursively if the code is not unique
    }
    return Rcode; // Return the unique code
  });
}

// ============================  USER REGISTER  =======================================
const insertUser = async (req, res, next) => {
  try {
    const userD = await User.findOne({ email: req.body.email });

    if (userD) {
      return res.render("register", {
        status: "failed",
        message: "User already exists",
      });
    }

    const spassword = await securePassword(req.body.password);
    if (!spassword) {
      return res.status(500).send("Failed to hash the password");
    }

    if (req.body.password !== req.body.confirm_password) {
      return res.render("register", {
        status: "failed",
        message: "Password and Confirm Password do not match",
      });
    }

    const myReferCode = await generateReferalCode();
    console.log(myReferCode, "referral code generated");

    req.session.firstName = req.body.firstName;
    req.session.lastName = req.body.lastName;
    req.session.mobile = req.body.mobile;
    req.session.email = req.body.email;
    req.session.password = spassword;
    req.session.referralCode = myReferCode;
    req.session.referredCode = req.body.referralCode;

    const otpsend = generateRandomNumericString(6);
    req.session.otpsend = {
      code: otpsend,
      expiry: Date.now() + 45 * 1000,
    };

    await sendVerifyMail(req.body.firstName, req.body.email, otpsend);

    res.render("otp", { user: req.body.email });
  } catch (error) {
    console.log("Error in user registration:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

// ============================  MAIL VERIFICATION  =======================================
const sendVerifyMail = async (name, email, otpsend) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });

    const mailOptions = {
      from: config.emailUser,
      to: email,
      subject: "Sign up Verification",
      html: `<p>Hi ${name},</p><p>Your OTP is: <strong>${otpsend}</strong><br><br><br>regards,<br><b>STYLO<b></p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email has been sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw error; // Propagate the error
  }
};

// ============================  REGISTER PAGE  RENDER  =======================================
const loadRegister = async (req, res) => {
  try {
    res.render("register");
  } catch (error) {
    console.log(error.message);
  }
};

// ============================  LOGIN PAGE  RENDER  =======================================
const loginLoad = async (req, res) => {
  try {
    // Pass the user information to the template
    res.render("login", { user: req.session.user_id });
  } catch (error) {
    console.log(error.message);
    // Handle errors appropriately
    res.status(500).send("Internal Server Error");
  }
};

// ============================  LOGOUT =======================================

const logout = (req, res) => {
  // Clear the session or perform any other logout actions
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    // Redirect to the home page or any other page after logout
    res.redirect("/");
  });
};

// ============================  VERIFY LOGIN  =======================================

const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    console.log(req.body);
    const userData = await User.findOne({ email: email });
    console.log(userData);
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (passwordMatch) {
        if (userData.is_verified === 0) {
          req.session.otpsend = await sendVerifyMail(
            userData.firstName,
            userData.email
          );
          console.log("Redirecting to OTP page");
          res.render("otp", { user: userData.email });
        } else if (userData.is_block == true) {
          console.log("Account is blocked");
          res.render("login", {
            status: "failed",
            message: "Your Account Has Been Blocked!",
          });
        } else {
          req.session.user_id = userData._id;
          console.log("Redirecting to home page");
          res.redirect("/");
        }
      } else {
        console.log("Incorrect email or password");
        res.render("login", {
          status: "failed",
          message: "Email and password are incorrect",
        });
      }
    } else {
      console.log("Invalid user details");
      res.render("login", {
        status: "failed",
        message: "Enter Correct Details",
      });
    }
  } catch (error) {
    console.log(error);
  }
};

// ============================ OTP VERIFICATION =======================================
const verifyOtp = async (req, res, next) => {
  try {
    console.log("Stored OTP:", req.session.otpsend);

    console.log("otp in session");
    if (req.session.otpsend && req.session.otpsend.code) {
      if (req.body.otp === req.session.otpsend.code) {
        console.log("otp correct");

        const user = new User({
          firstName: req.session.firstName,
          lastName: req.session.lastName,
          email: req.session.email,
          mobile: req.session.mobile,
          password: req.session.password,
          referralCode: req.session.referralCode, //refereal ivide vech
          is_verified: 1,
        });

        const savedUser = await user.save();
        console.log("User saved:", savedUser);

        // Clear sensitive data from the session
        // delete req.session.otpsend;
        // delete req.session.firstName;
        // delete req.session.lastName;
        // delete req.session.email;
        // delete req.session.mobile;
        // delete req.session.password;

        if (req.session.referralCode) {
          const referredUser = await User.findOne({
            referralCode: req.session.referredCode,
          });
          console.log(referredUser, "referredUser");
          if (referredUser) {
            referredUser.wallet += 200;

            const walletHistory = {
              transactionDate: Date.now(),
              transactionDetails: "Invitation bonus via referral code",
              transactionType: "Credit",
              transactionAmount: 200,
            };

            referredUser.walletHistory.push(walletHistory);
            await referredUser.save();

            //----------------
            const referringUser = await User.findOne({
              email: req.session.email,
            });
            console.log(referringUser, "referringUser");

            if (referringUser) {
              referringUser.wallet += 100;

              const walletHistoryReferring = {
                transactionDate: Date.now(),
                transactionDetails: "Referral bonus",
                transactionType: "Credit",
                transactionAmount: 100,
              };

              referringUser.walletHistory.push(walletHistoryReferring);
              await referringUser.save();
            }
          }
        }
        return res.render("login", {
          status: "success",
          message: "Your Account has been created.",
        });
      } else {
        // OTP verification failed, render OTP page with an error message
        return res.render("otp", {
          status: "error",
          message: "Invalid OTP. Please try again.",
        });
      }
    } else {
      // Handle the case where req.session.otpsend or req.session.otpsend.code is not defined
      return res.render("otp", {
        status: "error",
        message: "Session data not found. Please try again.",
      });
    }
  } catch (error) {
    console.log("Error during OTP verification:", error.message);
    // Handle errors appropriately
    return res.status(500).send("Internal Server Error");
  }
};

// ============================ RESEND OTP =======================================
const resendOtp = async (req, res, next) => {
  try {
    console.log("entered the function");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });

    // Generate a new OTP
    const newDigit = generateRandomNumericString(6);

    // Assuming req.session is accessible here, update it accordingly
    // If req.session is not available, consider using another approach to store the OTP
    // For example, you can store it in a database or another persistent storage
    req.session.otpsend = {
      code: newDigit,
      expiry: Date.now() + 45 * 1000, // 45 seconds expiry
    };

    const mailOptions = {
      from: config.emailUser,
      to: req.session.email, // Use req.session.email instead of 'email'
      subject: "For Reset Password",
      html: `<p> Hi, ${req.session.firstName} ${req.session.lastName}, your new OTP is: <strong>${newDigit}</strong></p>`,
    };

    // Send email and handle the response
    const info = await transporter.sendMail(mailOptions);

    // Redirect back to the OTP page with a success message in the query parameter
    res.redirect("/otp?success=OTP has been resent successfully");
  } catch (error) {
    // Redirect back to the OTP page with an error message in the query parameter
    res.redirect("/otp?error=Error in resending OTP. Please try again.");
  }
};

// ============================  USER LOGOUT  =======================================
const logoutUser = async (req, res) => {
  req.session.user_id = false;
  res.render("login");
};

// Placeholder for productList function - Update as per your implementation
const productList = async (req, res) => {
  // Implement your logic for rendering product list
  res.render("productList", { ProductDB: [] });
};

// ============================  SHOP PAGE LOADING  =======================================
const shopLoad = async (req, res) => {
  try {
    const productsPerPage = 6; // Adjusted to display 6 products per page
    const currentPage = parseInt(req.query.page) || 1;
    const searchQuery = req.query.q || ""; // Get search query or empty string if not provided

    // Fetch only active (not deleted) products
    const products = await Product.find({ is_deleted: false })
      .populate("category")
      .skip((currentPage - 1) * productsPerPage)
      .limit(productsPerPage)
      .exec();

    const totalProductsCount = await Product.countDocuments({
      is_deleted: false,
    });
    const totalPages = Math.ceil(totalProductsCount / productsPerPage);

    const categories = await categorySchema.find();
    const discount = await Offers.find({}); // ith product offer
    const discountCategory = await categoryOffer.find({});

    const renderData = {
      products: products,
      categories,
      discCat: discountCategory,
      discPrice: discount,
      searchQuery: searchQuery, // Pass search query to frontend
    };

    res.render("shop", {
      products,
      categories,
      currentPage,
      totalPages,
      discount,
      renderData,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};




// ============================ PRODUCT DETAIL LOAD  =======================================
const productDetailLoad = async (req, res) => {
  try {
    // Assuming the product ID is passed in the query parameters as productId
    const productId = req.query.id;
    console.log(productId);
    // Fetch product details from the database based on the product ID
    const fetchedProduct = await Product.findById(productId)
      .populate("category")
      .exec();

    if (!fetchedProduct) {
      // If the product is not found, handle the error and send an appropriate response
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }
    console.log(fetchedProduct);

    // Render the product details page or send the product data as JSON
    // For example, if using a template engine like EJS:
    res.render("productDetail", { product: fetchedProduct }); //from her goes to frontend

    // If sending JSON:
    // res.json({ success: true, data: fetchedProduct });
  } catch (error) {
    console.error("Error fetching product details:", error);
    // Handle the error and send an appropriate response
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// ============================ WISHLIST PAGE LOAD  =======================================
const loadWishlist = async (req, res) => {
  try {
    console.log("loadWishlist started __________________________");
    // Check if the user is authenticated
    const user = req.session.user_id;
    console.log(user);
    let userName;
    let wishlist;

    if (!user) {
      // User not authenticated, return 401 status and render wishlist page with an empty wishlist
      console.log("User not authenticated");
      return res.status(401).render("wishlist", { wishlist: [], userName });
    }

    // Find user data based on the user ID
    const userData = await User.findOne({ _id: user });

    if (!userData) {
      // User data not found, return 404 status and render error page with "User not found" message
      console.log("User not found");
      return res
        .status(404)
        .render("error", { errorMessage: "User not found" });
    }

    // Retrieve user name from user data
    userName = userData.firstName;
    console.log(userName);
    // Populate wishlist with product data using Product
    wishlist = await Wishlist.find({ userId: user }).populate("productid");
    console.log(wishlist);
    // Render the wishlist page with populated wishlist and user name
    res.render("wishlist", { wishlist, userName });
  } catch (error) {
    // Handle errors during the process, log details, return 500 status, and render error page with "Internal Server Error" message
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// ============================ ADD PRODUCT TO WISHLIST   =======================================

const addtoWishlist = async (req, res) => {
  console.log("wishkkkerri");
  try {
    const user = req.session.user_id;
    console.log(user, " userW");
    const pro_id = req.body.id;
    const wishlist = await Wishlist.findOne({ userId: user });
    console.log(wishlist, "wishlistdb");
    const checkwishlistdata = await Wishlist.findOne({
      userId: user,
      productid: pro_id,
    });
    console.log(checkwishlistdata, "datas");

    if (user) {
      if (wishlist) {
        if (checkwishlistdata) {
          res.json({ result: false });
        } else {
          await Wishlist.updateOne(
            { userId: user },
            { $push: { productid: pro_id } }
          );
          res.json({ result: true });
        }
      } else {
        const data = new Wishlist({
          userId: user,
          productid: [pro_id],
        });

        await data.save();
        res.json({ result: true });
      }
    } else {
      res.json({ result: false });
    }
  } catch (error) {
    console.log(error.message);
    res.render("500");
  }
};

const deleteWishlistproduct = async (req, res) => {
  try {
    const user = req.session.user_id;
    const pro_id = req.query.id;

    // Find the wishlist entry for the user
    const wishlist = await Wishlist.findOne({ userId: user });

    if (!wishlist) {
      console.log("Wishlist not found for user:", user);
      return res
        .status(404)
        .json({ success: false, message: "Wishlist not found" });
    }

    // Check if the product ID exists in the wishlist
    const productIndex = wishlist.productid.indexOf(pro_id);
    if (productIndex === -1) {
      console.log("Product not found in wishlist");
      return res
        .status(404)
        .json({ success: false, message: "Product not found in wishlist" });
    }

    // Remove the product ID from the wishlist
    wishlist.productid.splice(productIndex, 1);
    await wishlist.save();

    console.log("Product removed from wishlist");

    res.redirect("/wishlist");
  } catch (error) {
    console.error("Error deleting product from wishlist:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// =====================================================================================================================================

module.exports = {
  
  generateReferalCode,
  loadRegister,
  loadHome,
  securePassword,
  insertUser,
  sendVerifyMail,
  verifyOtp,
  loginLoad,
  logout,
  verifyLogin,
  logoutUser,
  productList,
  resendOtp,
  shopLoad,
  productDetailLoad,
  loadWishlist,
  addtoWishlist,
  deleteWishlistproduct,
};
