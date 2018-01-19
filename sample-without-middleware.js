"use strict";

require("dotenv").config();

const app = require("express")();
const uuid = require("uuid/v4");
const cache = require("memory-cache");
const session = require("express-session");
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
    debug(`server is listening to ${process.env.PORT || 5000}...`);
});

app.get("/pay", (req, res, next) => {
    let options = {
        productName: "demo product",
        amount: 1,
        currency: "JPY",
        orderId: uuid(),
        confirmUrl: process.env.LINE_PAY_CONFIRM_URL,
        confirmUrlType: "CLIENT"
    }

    pay.reserve(options).then((response) => {
        let reservation = options;
        reservation.transactionId = response.info.transactionId;

        debug(`Reservation was made. Detail is following.`);
        debug(reservation);

        if (options.confirmUrlType == "SERVER"){
            cache.put(reservation.orderId, reservation);
        } else {
            req.session = reservation;
        }

        res.redirect(response.info.paymentUrl.web);
    })
});

app.get("/pay/confirm", (req, res, next) => {
    let reservation;

    debug(`transactionId is ${req.query.transactionId}`);

    if (req.query.orderId) {
        debug(`Found orderId so confirmUrlType should be SERVER.`);
        debug(`orderId is ${req.query.orderId}`);
        reservation = cache.get(req.query.orderId);
    } else if (req.session && req.session.orderId){
        debug(`orderId not found so confirmUrlType should be CLIENT.`);
        reservation = req.sessoin;
    } else {
        throw new Error("Order id not found.");
    }
    
    debug(`Retrieved following reservation.`);
    debug(reservation);

    let transactionId = req.query.transactionId;
    let options = {
        transactionId: transactionId,
        amount: reservation.amount,
        currency: reservation.currency
    }

    debug(`Going to confirm payment with following options.`);
    debug(options);

    pay.confirm(options).then((response) => {
        res.json(response);
    });
});
