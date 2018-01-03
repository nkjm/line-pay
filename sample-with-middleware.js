"use strict";

require("dotenv").config();

const app = require("express")();
const uuid = require("uuid/v4");
const debug = require("debug")("line-pay:server");

let line_pay
if (process.env.NODE_ENV == "development"){
    line_pay = require("./module/line-pay");
} else {
    line_pay = require("line-pay");
}

const pay = new line_pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
    isSandbox: false
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`server is listening to ${process.env.PORT || 5000}...`);
});

app.use("/pay", pay.middleware({
    productName: "demo product",
    amount: 1,
    currency: "JPY",
    orderId: uuid(),
    confirmUrl: process.env.LINE_PAY_CONFIRM_URL,
    capture: false,
    payType: "PREAPPROVED"
}), (req, res, next) => {
    // Now payment should have been completed.
    res.send("Payment has been completed.");
});
