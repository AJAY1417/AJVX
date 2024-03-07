

const User = require("../models/userModel");

const Razorpay = require("razorpay");


const razorpayInstance = new Razorpay({
  key_id: "rzp_test_Rr5LK4XJjm8rxm",
  key_secret: "f4QOCHAFThYVJH9z8lX8OPhN",
});

const showWallet = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id).exec();

    if (!user) {
      // Handle the case where user is not found
      return res.status(404).send("User not found");
    } 

    // Assuming walletBalance and walletHistory are properties of the user object
    const walletBalance = user.walletBalance;
    const walletHistory = user.walletHistory;

    // Render the profile.ejs template and pass the user object
 res.render("users/profile", {
   user: user,
   walletBalance: walletBalance,
   walletHistory: walletHistory,
   success: req.flash("success"),
 });


  } catch (error) {
    console.error("Error rendering profile:", error);
    res.status(500).send("Internal Server Error");
  }
};



// Controller function to add money to the user's wallet
const addMoneyToWallet = async (req, res) => {
  try {
    const { userId, amount } = req.body; // Assuming you send userId and amount in the request body

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      // User not found
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user's wallet balance
    user.wallet += parseFloat(amount);
    
    // Add a record to wallet history
    user.walletHistory.push({
      date: new Date(),
      amount: parseFloat(amount),
      message: 'Added Money to Wallet',
      type: 'Credit',
    });

    // Save the updated user object
    await user.save();

    // Send a success response
    return res.status(200).json({ success: true, message: 'Money added to wallet successfully' });
  } catch (error) {
    console.error('Error adding money to wallet:', error);
    // Handle the error appropriately
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}; 



module.exports = {
  showWallet,
  addMoneyToWallet,
};