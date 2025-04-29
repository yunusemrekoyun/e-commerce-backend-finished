/********************************************************
 * /Applications/Works/e-commerce/backend/routes/index.js
 ********************************************************/
const express = require("express");
const router = express.Router();

const dashboardRoute = require("./dashboard.js");
const categoryRoute = require("./categories.js");
const authRoute = require("./auth.js");
const productRoute = require("./products.js");
const couponRoute = require("./coupons.js");
const userRoute = require("./users.js");
const paymentRoute = require("./payment.js");
const addressRoute = require("./address.js");
const ordersRoute = require("./orders.js");
const discountRoute = require("./discount.js");

// Routerlar
router.use("/auth", authRoute);
router.use("/users", userRoute);
router.use("/categories", categoryRoute);
router.use("/products", productRoute);
router.use("/orders", ordersRoute);
router.use("/discounts", discountRoute);
router.use("/coupons", couponRoute);
router.use("/payment", paymentRoute);
router.use("/address", addressRoute);
router.use("/dashboard", dashboardRoute);
module.exports = router;
