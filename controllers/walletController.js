// walletController.js
const User = require("../models/userModel");

const showWallet = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id).exec();

    if (!user) {
      return res.status(404).send("User not found");
    }

    const walletBalance = user.wallet;
    const walletHistory = user.walletHistory;

    res.render("users/profile", {
      User: user,
      walletBalance: walletBalance,
      walletHistory: walletHistory,
      success: req.flash("success"),
    });
  } catch (error) {
    console.error("Error rendering profile:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addMoneyToWallet = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.wallet += parseFloat(amount);
    user.walletHistory.push({
      date: new Date(),
      amount: parseFloat(amount),
      message: "Added Money to Wallet",
      type: "credit", // Change to lowercase to match enum values
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Money added to wallet successfully",
      updatedBalance: user.wallet,
    });
  } catch (error) {
    console.error("Error adding money to wallet:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  showWallet,
  addMoneyToWallet,
};
