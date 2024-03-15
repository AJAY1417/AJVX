// Example logs in the isLogin middleware
const isLogin = async (req, res, next) => {
  try {
    console.log("isLogin middleware triggered");
    if (req.session.user_id) {
      next(); // Call next only if the user is logged in
    } else {
      console.log("Redirecting to login page");
      res.redirect("/login"); // Redirect to the login page
    }
  } catch (error) {
    console.log(error.message);
    // Handle the error as needed
    res.status(500).send("Internal Server Error");
  }
};

const isLogout = async (req, res, next) => {
 try {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        res.status(500).send("Internal Server Error");
      } else {
        // Redirect to the home page or any appropriate page after logout
        res.redirect("/");
      }
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).send("Internal Server Error");
  }

};

const isBlocked = async (req, res, next) => {
  try {
    // Assuming you have the User model imported
    const user = await User.findOne({ _id: req.session.user_id });

    if (user && user.is_block) {
      // User is blocked, redirect to login page
      res.redirect("/login");
    } else {
      // User is not blocked, continue to the next middleware or route handler
      next();
    }
  } catch (error) {
    console.log(error.message);
    // Handle the error as needed
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  isLogin,
  isLogout,
  isBlocked,
};
