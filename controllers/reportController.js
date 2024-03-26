const Product = require("../models/productmodel");
const User = require("../models/userModel");
const Orders = require("../models/ordermodel");
const ExcelJS = require("exceljs");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const ejs = require("ejs");

// ===============LOAD SALES REPORT=============================

const loadSalesReport = async (req, res) => {
  try {
    const users = await User.find({ isListed: 0 });

    const orderData = await Orders.aggregate([
      { $unwind: "$products" },
      { $match: { "products.orderStatus": "Delivered" } },
      { $sort: { date: -1 } },
      {
        $lookup: {
          from: "products",
          let: { productId: { $toObjectId: "$products.productId" } },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$productId"] } } }],
          as: "products.productDetails",
        },
      },
      {
        $addFields: {
          "products.productDetails": {
            $arrayElemAt: ["$products.productDetails", 0],
          },
        },
      },
    ]);

    res.render("sales-report", {
      orders: orderData,
      users,
    });
  } catch (error) {
    res.render("500");
  }
};
// =================SALER SORTING===========================

const saleSorting = async (req, res) => {
  try {
    const duration = parseInt(req.params.id);
    const currentDate = new Date();
    const startDate = new Date(currentDate - duration * 24 * 60 * 60 * 1000);

    const orders = await Orders.aggregate([
      {
        $unwind: "$products",
      },
      {
        $match: {
          "products.orderStatus": "Delivered",
          expectedDelivery: { $gte: startDate, $lt: currentDate },
        },
      },
      {
        $sort: { expectedDelivery: -1 },
      },
      {
        $lookup: {
          from: "products",
          let: { productId: { $toObjectId: "$products.productId" } },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$productId"] } } }],
          as: "products.productDetails",
        },
      },
      {
        $addFields: {
          "products.productDetails": {
            $arrayElemAt: ["$products.productDetails", 0],
          },
        },
      },
    ]);

    res.render("sales-report", { orders });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

// ===============DOWNLOAD REPORT=============================

const downloadReport = async (req, res) => {
  try {
    const { duration, format } = req.params;
    const currentDate = new Date();
    const startDate = new Date(currentDate - 1 * 24 * 60 * 60 * 1000);
    const orders = await Orders.aggregate([
      {
        $unwind: "$products",
      },
      {
        $match: {
          "products.orderStatus": "Delivered",
        },
      },
      {
        $sort: { expectedDelivery: -1 },
      },
      {
        $lookup: {
          from: "products",
          let: { productId: { $toObjectId: "$products.productId" } },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$productId"] } } }],
          as: "products.productDetails",
        },
      },
      {
        $addFields: {
          "products.productDetails": {
            $arrayElemAt: ["$products.productDetails", 0],
          },
        },
      },
    ]);
    const date = new Date();
    data = {
      orders,
      date,
    };

    if (format === "pdf") {
      const filepathName = path.resolve(
        __dirname,
        "../view/admin/ReportPdf.ejs"
      );

      const html = fs.readFileSync(filepathName).toString();
      const ejsData = ejs.render(html, data);

      const browser = await puppeteer.launch({ headless: "new" });
      const page = await browser.newPage();
      await page.setContent(ejsData, { waitUntil: "networkidle0" });
      const pdfBytes = await page.pdf({ format: "letter" });
      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename= Sales Report.pdf"
      );
      res.send(pdfBytes);
    } else if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sales Report");

      worksheet.columns = [
        { header: "Order ID", key: "orderId", width: 8 },
        { header: "Product Name", key: "productName", width: 50 },
        { header: "Qty", key: "qty", width: 5 },
        { header: "Date", key: "date", width: 12 },
        { header: "Customer", key: "customer", width: 15 },
        { header: "Total Amount", key: "totalAmount", width: 12 },
      ];
      orders.forEach((data) => {
        worksheet.addRow({
          orderId: data.trackId,
          productName: data.products.productDetails.name,
          qty: data.products.quantity,
          date: data.date
            .toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })
            .replace(/\//g, "-"),
          customer: data.userName,
          totalAmount: data.products.price * data.products.quantity,
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${duration}_sales_report.xlsx`
      );
      const excelBuffer = await workbook.xlsx.writeBuffer();
      res.end(excelBuffer);
    } else {
      res.status(400).send("Invalid format specified");
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  loadSalesReport,
  downloadReport,
  saleSorting,
};
