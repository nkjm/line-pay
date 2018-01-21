"use strict";

require("dotenv").config();

const router = require("express").Router();
const uuid = require("uuid/v4");
const cache = require("memory-cache"); // To save order information.
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

router.get("/", (req, res, next) => {
    let options = {
        productName: "demo product",
        amount: 1,
        currency: "JPY",
        orderId: uuid(),
        confirmUrl: `https://${req.hostname}${req.baseUrl}/confirm`,
        confirmUrlType: "SERVER"
    }

    pay.reserve(options).then((response) => {
        let reservation = options;
        reservation.transactionId = response.info.transactionId;

        debug(`Reservation was made. Detail is following.`);
        debug(reservation);

        // Save order information
        cache.put(reservation.transactionId, reservation);

        res.redirect(response.info.paymentUrl.web);
    })
});

router.get("/confirm", (req, res, next) => {

    debug(`transactionId is ${req.query.transactionId}`);
    let reservation = cache.get(req.query.transactionId);

    if (!reservation){
        throw new Error("Reservation not found.");
    }

    debug(`Retrieved following reservation.`);
    debug(reservation);

    let options = {
        transactionId: req.query.transactionId,
        amount: reservation.amount,
        currency: reservation.currency
    }

    debug(`Going to confirm payment with following options.`);
    debug(options);

    pay.confirm(options).then((response) => {
        res.json(response);
    });
});

module.exports = router;
