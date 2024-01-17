const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const config = require("../config/config");

const nodemailer = require("nodemailer");
const randomString = require("randomstring");
const flash = require("express-flash");




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
    res.render("home");
  } catch (error) {
    console.log(error.message);
  }
};
 

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
;
    if (!spassword) {
      return res.status(500).send("Failed to hash the password");
    }

    if (req.body.password !== req.body.confirm_password) {
      return res.render("register", {
        status: "failed",
        message: "Password and Confirm Password do not match",
      });
    }

    req.session.firstName = req.body.firstName;
    req.session.lastName = req.body.lastName;
    req.session.mobile = req.body.mobile;
    req.session.email = req.body.email;
    req.session.password = spassword;

    const otpsend = generateRandomNumericString(6);
    req.session.otpsend = {
      code: otpsend,
      expiry: Date.now() + 45 * 1000, // 45 seconds expiry
    };

    await sendVerifyMail(req.body.firstName, req.body.email, otpsend);

    // Assuming user creation was successful, clean up sensitive data from the session
  

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
    res.render("login");
  } catch (error) {
    console.log(error.message);
  }
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
        } else if (2 == 1) {
          console.log("Account is blocked");
          res.render("register", {
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

    console.log('otp in session');
    // Check if req.session.otpsend and req.session.otpsend.code are defined
    if (req.session.otpsend && req.session.otpsend.code) {
      // Compare the entered OTP with the stored OTP
      if (req.body.otp === req.session.otpsend.code) {
        console.log('otp correct');

        

        const user = new User({
          firstName: req.session.firstName,
          lastName: req.session.lastName,
          email: req.session.email,
          mobile: req.session.mobile,
          password:req.session.password,
          is_verified: 1,
        });

        // Save the user to the database
        const savedUser = await user.save();
        console.log("User saved:", savedUser);

        // Clear sensitive data from the session
        delete req.session.otpsend;
        delete req.session.firstName;
        delete req.session.lastName;
        delete req.session.email;
        delete req.session.mobile;
        delete req.session.password;

        // Render the login page with a success message
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

    console.log("Email has been sent:", info.response);

    // Redirect back to the OTP page with a success message in the query parameter
    res.redirect('/otp?success=OTP has been resent successfully');
  } catch (error) {
    console.error("Error in resendOtp:", error);

    // Redirect back to the OTP page with an error message in the query parameter
    res.redirect('/otp?error=Error in resending OTP. Please try again.');
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

module.exports = {
  loadRegister,
  loadHome,
  securePassword,
  insertUser,
  sendVerifyMail,
  verifyOtp,
  loginLoad,
  verifyLogin,
  logoutUser,
  productList,
  resendOtp,
};
