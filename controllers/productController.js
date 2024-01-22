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
    const blockedProduct = await productSchema.findOne({ _id: req.query.id });

    if (!blockedProduct) {
      return res.status(404).send("Product not found");
    }

    const is_deleted = blockedProduct.is_deleted;

    // Update the 'is_deleted' field to block or unblock the product
    await productSchema.updateOne(
      { _id: req.query.id },
      { $set: { is_deleted: !is_deleted } }
    );

    res.redirect("/admin/products");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const editProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    // Find the product based on the ID
    const productData = await productSchema.findOne({ _id: productId });

    if (!productData) {
      return res.status(404).render("error", { message: "Product not found" });
    }

    if (req.method === "POST") {
      // Handle the form submission for updating the product
      return res.redirect(`/admin/product/${productId}`);
    }

    // Render the 'editProduct' view with the existing product data
    res.render("editProduct", { product: productData });
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
};
