const Product = require("../models/productModel");
const Offers = require("../models/productOfferModel");

// Load product offer management page
const loadOffers = async (req, res) => {
  try {
    const offerDB = await Offers.find({}).lean();
    res.render("productOfferManagement", { offerDB });
  } catch (error) {
    console.error("Error rendering view:", error);
    console.error("Current working directory:", process.cwd());
    res.status(500).send("Internal Server Error");
  }
};

// Load add offer page on products
const loadAddOffer = async (req, res) => {
  try {
    const product = await Product.find({ is_deleted: false });
    res.render("addOffer", { product });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Add offers on products
const addOffers = async (req, res) => {
  try {
    const productData = await Product.findOne({ name: req.body.product });

    if (!productData) {
      return res.redirect("/admin/offers");
    }

    const percent = req.body.percentage;
    const newOffer = new Offers({
      product: productData._id,
      productname: req.body.product,
      percentage: percent,
      expiryDate: req.body.EndingDate,
    });

    await newOffer.save();
    const productDB = await Product.findOne({ _id: productData._id });
    const offerPrice = Math.floor((productDB.price * percent) / 100);

    await Product.updateOne(
      { _id: productData._id },
      { $set: { discountPricepro: productDB.price - offerPrice } }
    );

    res.redirect("/admin/offers");
  } catch (error) {
    console.log(error.message);
    res.redirect("/admin/offers");
  }
};

// Delete offer on product
const deleteOffer = async (req, res) => {
  try {
    const currentData = await Offers.findOne({ _id: req.query.id });

    if (!currentData) {
      return res.status(404).send("Offer not found");
    }

    if (currentData.expiryDate < new Date()) {
      console.log("Offer is expired");
    } else {
      const productDB = await Product.findOne({ _id: currentData.product });

      if (productDB) {
        console.log("Offer is not expired");
        productDB.discountPricepro = null;
        await productDB.save();
      }
    }

    await Offers.deleteOne({ _id: req.query.id });
    res.redirect("/admin/offers");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  loadOffers,
  loadAddOffer,
  addOffers,
  deleteOffer,
};
