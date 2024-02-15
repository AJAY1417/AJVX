const mongoose = require("mongoose");

// Define the schema for the Address
const userAddressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference the User model
    required: true,
  },
  address: [
    {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      mobile: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
      },
      houseNo: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      zipcode: {
        type: String,
        required: true,
        trim: true,
      },
      additionalDetails: {
        type: String,
        trim: true,
      },
    },
  ],
});

// Create the Address model based on the schema
const Address = mongoose.model("Address", userAddressSchema);

// Export the Address model
module.exports = Address;
