const Product = require("../models/productModel");
const Offers = require("../models/productOfferModel");
const Category = require("../models/categoryModel");
const CategoryOffer = require("../models/categoryOfferModel");

//=============================================================================================================================================

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
//____________________________________________________________________________________________________________________________



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
//____________________________________________________________________________________________________________________________
// Add offers on products

const addOffers = async (req, res) => {
  try {
    console.log("started")
    const productData = await Product.findOne({ name: req.body.product });

    if (!productData) {
      return res.redirect("/admin/offers");
    }

    const percent = req.body.percentage;
    const newOffer = new Offers({//model storing 
      product: productData._id,
      productname: req.body.product,
      percentage: percent,
      expiryDate: req.body.EndingDate,
    });

    await newOffer.save();
    const productDB = await Product.findOne({ _id: productData._id });
    const offerPrice = Math.floor((productDB.price * percent) / 100);
    console.log(productData._id,"___________________");
    console.log(offerPrice,"offerPrice________________________")

    await Product.updateOne(
      { _id: productData._id },
      { $set: { discountPricepro: productDB.price - offerPrice } }
    );
    //______________________
    //just console cheyyan vendi 
  const updatedProduct = await Product.findOne({ _id: productData._id });

  console.log(
    updatedProduct.discountPricepro,
    "discountPricepro________________________"
  );
  //______________________
    res.redirect("/admin/offers");
  } catch (error) {
    console.log(error.message);
    res.redirect("/admin/offers");
  }
};
//____________________________________________________________________________________________________________________________
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
//_________________________________________________________________________________________________________________________________________________________

//============================== CATEGORY OFFERS ===================================



const loadCategoryOffers = async (req, res) => {
  try {
    const categoryOffers = await CategoryOffer.find({}).lean(); // lean for populate
    res.render("categoryOfferManagement", { categoryOffers });
  } catch (error) {
    console.log(error.message);
    res.render("admin/categoryOfferManagement", { categoryOffers: [] });
  }
};
// load add offer page on categories

const loadAddCategoryOffer = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render("addCategoryOffer", { categories });
  } catch (error) {
    console.log(error.message);
    res.render("categoryOfferManagement", { categoryOffers: [] });
  }
};

//add offers on category
const addCategoryOffer = async (req, res) => {
  try {
    const categoryName = req.body.categories; // Store category name
    const categoryData = await Category.findOne({ name: categoryName });

    if (!categoryData) {
      console.log("Category not found:", categoryName);
      return res.redirect("/admin/offersCat");
    }

    const percent = parseFloat(req.body.percentage); // Ensure it's a number

    const newCategoryOffer = new CategoryOffer({
      categoryname: categoryName,
      category: categoryData._id,
      percentage: percent,
      expiryDate: req.body.EndingDate,
    });

    await newCategoryOffer.save();

    // Fetch products efficiently using the category ID
    const productsInCategory = await Product.find({
      category: categoryData._id,
    });

    for (const product of productsInCategory) {
      const offerPrice = Math.floor(product.price * (1 - percent / 100));

      // Use $set to update only discountPricecat
      await Product.updateOne(
        { _id: product._id },
        { $set: { discountPricecat: offerPrice } }
      );
    }

    console.log("Category Offer added successfully for:", categoryName);

    res.redirect("/admin/offersCat");
  } catch (error) {
    console.error("Error adding category offer:", error); // Detailed error logging
    res.status(500).send("Internal Server Error");
  }
};

//delete category offer


const deleteCategoryOffer = async (req, res) => {
  try {
    const currentData = await CategoryOffer.findOne({ _id: req.query.id });

    if (!currentData) {
      return res.status(404).send("Category Offer not found");
    }

    // 1. Update products in the category
    const productDB = await Product.find({
      category: currentData.category, // Use the category ID field
    });

    if (productDB.length > 0) {
      console.log("Offer is not expired");

      for (const product of productDB) {
        if (product.discountPricecat) {
          product.discountPricecat = null;
          await product.save();
          console.log(product);
        }
      }
    }

    // 2. Delete the category offer after updating products
    await CategoryOffer.deleteOne({ _id: req.query.id });

    res.redirect("/admin/offersCat");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};



//======================================================================================================================================================
module.exports = {
  loadOffers,
  loadAddOffer,
  addOffers,
  deleteOffer,
  loadCategoryOffers,
  loadAddCategoryOffer,
  addCategoryOffer,
  deleteCategoryOffer,
};
