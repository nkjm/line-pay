"use strict";

require("dotenv").config();

const router = require("express").Router();
const uuid = require("uuid/v4");
const debug = require("debug")("line-pay:router");

let line_pay
if (process.env.NODE_ENV == "development"){
    line_pay = require("../module/line-pay");
} else {
    line_pay = require("line-pay");
}

const pay = new line_pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
    hostname: process.env.LINE_PAY_HOSTNAME,
    isSandbox: false
});

router.use("/", pay.middleware({
    productName: "demo product",
    amount: 1,
    currency: "JPY",
    orderId: uuid(),
    capture: false,
    payType: "PREAPPROVED"
}), (req, res, next) => {
    // Now payment should have been completed.
    res.send("Payment has been completed.");
});

module.exports = router;
