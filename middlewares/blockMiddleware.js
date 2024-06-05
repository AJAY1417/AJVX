const mongoose = require("mongoose");
const User = require("../models/userModel"); // Adjust path as needed

const isUserBlocked = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    // Log the userId for debugging purposes
    console.log("User ID:", userId);

    // Validate the userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error("Invalid user ID:", userId);
      return res.redirect("/login");
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).send("Unauthorized: User not found.");
    }

    if (user.is_block) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        return res.redirect(
          "/login?message=Your account is blocked. Please contact support."
        );
      });
    } else {
      next();
    }
  } catch (error) {
    console.error("Error in isUserBlocked middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = isUserBlocked;
