const productSchema = require("../models/productModel");
const categorySchema = require("../models/categoryModel");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

//=================== LOAD PRODUCT PAGE =========================================================================//

// Load all products and render the 'product' view with the product list
const productLoad = async (req, res) => {
  try {
    const productList = await productSchema.find().populate("category").exec();
    res.render("product", { products: productList });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

//===================  ADD PRODUCT PAGE LOAD ==============================================
const addProductLoad = async (req, res) => {
  try {
    // Fetch the list of categories
    const categoryList = await categorySchema.find();
    // Render the 'addProduct' view with the category list
    res.render("addProduct", { category: categoryList });
  } catch (error) {
    console.log(error.message);
  }
};

//=================== TO ADD PRODUCT ==============================================
const addProduct = async (req, res) => {
  try {
    const { productName, description, category, price, quantity } = req.body;
    // this condition is to check validation of product name and quantity
    if (!productName || !quantity || isNaN(quantity) || quantity <= 0) {
      return res
        .status(400)
        .render("addProduct", { message: "Invalid product name or quantity" });
    }

    const categoryData = await categorySchema.findOne({ _id: category });
    const coverPic = req.files.map((file) => file.filename);

    const productData = await productSchema.create({
      name: productName,
      description: description,
      category: category,
      price: price,
      quantity: quantity,
      images: coverPic,
    });

    if (productData) {
      res.redirect("product");
    } else {
      res.render("addProduct", { message: "Something wrong." });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).render("addProduct", { message: "Internal Server Error" });
  }
};

//===================  BLOCKS THE PRODUCT ==============================================
const blockProduct = async (req, res) => {
  try {
    const productId = req.query.id;

    if (!productId) {
      return res.status(400).send("Invalid product ID");
    }

    const product = await productSchema.findById(productId); // <-- Corrected here

    if (!product) {
      return res.status(404).send("Product not found");
    }

    product.is_deleted = !product.is_deleted;

    await product.save();

    res.redirect("/admin/products");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

//===================  EDITS THE PRODUCT  ==============================================

const editProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const productData = await productSchema.findOne({ _id: productId });
    const categoryList = await categorySchema.find();

    if (!productData) {
      return res.status(404).render("error", { message: "Product not found" });
    }

    res.render("editProduct", { product: productData, category: categoryList });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


//=================== UPDATE THE PRODUCT ==============================================
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Extract relevant information from the request body
    const { productName, description, category, price, quantity } = req.body;

    // Find the product in the database by ID
    const product = await productSchema.findById(productId);

    // Check if the product exists
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Update the product information
    product.name = productName;
    product.description = description;
    product.category = category;
    product.price = price;
    product.quantity = quantity;

    // Save the updated product
    await product.save();

    // Redirect to the main Products page after updating the product
    return res.redirect("/admin/product");
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
};

//===================================== SEARCH IN SHOP PAGE  ==============================================

const search = async (req, res) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const products = await productSchema.find({
      name: { $regex: searchQuery, $options: "i" },
    }).populate("category");
    console.log(products,"products")

    res.json({ results: products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};


//===================================== SORT PRICE IN SHOP PAGE  ==============================================
// Backend code to filter products based on selected categories and support pagination
const filterProducts = async (req, res) => {
  try {
    const { categories, page = 1, limit = 10 } = req.body; // Assuming the frontend sends an array of selected categories, page number, and limit

    // Build the query to filter products based on selected categories
    let query = {};
    if (categories && categories.length > 0) {
      query["category"] = { $in: categories };
    }

    // Calculate the skip value for pagination
    const skip = (page - 1) * limit;

    // Query the database to retrieve filtered products with pagination
    const filteredProducts = await productSchema.find(query)
      .skip(skip)
      .limit(limit)
      .populate("category");

    // Get the total count of filtered products
    const totalFilteredProducts = await productSchema.countDocuments(query);

    res.json({
      success: true,
      products: filteredProducts,
      totalProducts: totalFilteredProducts,
      currentPage: page,
      totalPages: Math.ceil(totalFilteredProducts / limit)
    });
  } catch (error) {
    console.error("Error filtering products:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};


//===================================== All Products   ==============================================


const getAllProducts = async (req, res) => {
  try {
   res.render()
  } catch (error) {
    console.error("Error fetching all products:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
//===================  TO UPLOAD THE IMAGES FOR PRODUCTS ==============================================

const uploadProductImages = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await productSchema.findOne({ _id: productId });

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Add the image filenames (or other relevant information) to the product's images array
    req.files.forEach((file) => {
      product.images.push(file.filename);
    });

    await product.save();

    // Redirect or respond as needed
    res.redirect(`/admin/editProduct/${productId}`);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

//=================== DELETE THE IMAGES SEPA=ERATELY ==============================================

const deleteProductImage = async (req, res) => {
  try {
    const productId = req.params.productId;
    const imageIndex = parseInt(req.params.imageIndex, 10);

    // Validate product ID and image index
    if (
      !mongoose.isValidObjectId(productId) ||
      isNaN(imageIndex) ||
      imageIndex < 0
    ) {
      return res.status(400).send("Invalid product ID or image index");
    }

    // Find the product by ID
    const product = await productSchema.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Validate image index within product's images array
    if (imageIndex >= product.images.length) {
      return res.status(400).send("Invalid image index");
    }

    // Extract image name from array, considering your storage strategy
    const imageName = product.images[imageIndex];

    // Remove image from product's images array
    product.images.splice(imageIndex, 1);

    // Save the updated product
    await product.save();

    // Respond with success status (200) to the client
    res.status(200).send("Image deleted successfully");
  } catch (error) {
    console.error("Error deleting product image:", error);
    res.status(500).send("Internal server error");
  }
};

//===================  TO LOAD THE EDIT PRODUCT PAGE ==============================================
const editProductLoad = async (req, res) => {
  try {
    const productId = req.params.productId;
    // Find the product based on the ID and populate the 'category' field
    const productData = await productSchema
      .findOne({ _id: productId })
      .populate("category");

    if (!productData) {
      return res.status(404).render("error", { message: "Product not found" });
    }

    // Fetch the list of categories
    const categoryList = await categorySchema.find();

    // Render the 'editProduct' view with the existing product data and category list
    res.render("editProduct", { product: productData, category: categoryList });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
};

//===================  EXPORTED ARE HERE  ==============================================

module.exports = {
  productLoad,
  addProductLoad,
  addProduct,
  blockProduct,
  editProductLoad,
  editProduct,
  updateProduct,
  uploadProductImages,
  deleteProductImage,
  search,
  filterProducts,
  getAllProducts,
};
