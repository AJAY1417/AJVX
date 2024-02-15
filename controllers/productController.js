const productSchema = require("../models/productModel");
const categorySchema = require("../models/categoryModel");

//=================== LOAD PRODUCT PAGE =========================================================================//

// Load all products and render the 'product' view with the product list
const productLoad = async (req, res) => {
  try {
    // Fetch the list of products, populating the 'category' field
    const productList = await productSchema.find().populate("category").exec();
    res.render("product", { products: productList });
  } catch (error) {
    console.log(error.message);
  }
};

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

const addProduct = async (req, res) => {
  try {
    console.log(req.body);
    const productName = req.body.productName;
    const description = req.body.description;
    const category = req.body.category;
    const price = req.body.price;
    const quantity = req.body.quantity;

    // Find the category based on the ID
    const categoryData = await categorySchema.findOne({ _id: category });

    const coverPic = [];
    for (let i = 0; i < req.files.length; i++) {
      coverPic[i] = req.files[i].filename;
    }

    // Create a new product
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
    console.log(error.message);
    res.status(500).render("addProduct", { message: "Internal Server Error" });
  }
};
const blockProduct = async (req, res) => {
  try {
    const productId = req.query.id;

    // Check if the product ID is valid
    if (!productId) {
      return res.status(400).send("Invalid product ID");
    }

    // Find the product in the database by ID
    const product = await productSchema.findById(productId); // <-- Corrected here

    // Check if the product exists
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Toggle the block status
    product.is_deleted = !product.is_deleted; // <-- Updated property name

    // Save the updated product
    await product.save();

    // Redirect or respond as needed
    res.redirect("/admin/products"); // Adjust the redirect path as needed
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};





const editProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const productData = await productSchema.findOne({ _id: productId });
    const categoryList = await categorySchema.find();

    if (!productData) {
      return res.status(404).render("error", { message: "Product not found" });
    }

    // Render the 'editProduct' view with the existing product data and category list
    res.render("editProduct", { product: productData, category: categoryList });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
};



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

module.exports = {
  productLoad,
  addProductLoad,
  addProduct,
  blockProduct,
  editProductLoad,
  editProduct,
  updateProduct
};
