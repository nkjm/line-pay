"use strict";

require("dotenv").config();

// Required constants
const LINE_PAY_PREAPPROVED_REGKEY = process.env.LINE_PAY_PREAPPROVED_REGKEY;
const LINE_PAY_PREAPPROVED_PRODUCT_NAME = "demo product";
const LINE_PAY_PREAPPROVED_AMOUNT = 1;
const LINE_PAY_PREAPPROVED_CURRENCY = "JPY";

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const debug = require("debug")("line-pay:test");
const request = require("request");
const uuid = require("uuid/v4");
const line_pay = require("../module/line-pay.js")
const TIMEOUT = 5000;
Promise = require("bluebird");
Promise.promisifyAll(request);

chai.use(chaiAsPromised);
let should = chai.should();

let pay = new line_pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
    isSandbox: false
});

describe("Test method in authorized status", function(){
    describe("Inquire with correct parameters.", function(){
        it("should return result.", function(){
            this.timeout(TIMEOUT);
            let orderId = uuid();
            return Promise.resolve().then(function(){
                let options = {
                    regKey: LINE_PAY_PREAPPROVED_REGKEY,
                    productName: LINE_PAY_PREAPPROVED_PRODUCT_NAME,
                    amount: LINE_PAY_PREAPPROVED_AMOUNT,
                    currency: LINE_PAY_PREAPPROVED_CURRENCY,
                    orderId: orderId,
                    capture: false
                }
                return pay.confirmPreapprovedPay(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
                let options = {
                    orderId: orderId
                }
                return pay.inquireAuthorization(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
                response.info[0].productName.should.equal("demo product");
            });
        });
    });

    // We can enable these tests once we can retrieve valid transaction id.
    /*
    describe("Capture with correct parameters.", function(){
        it("should capture.", function(){
            this.timeout(TIMEOUT);
            let orderId = uuid();
            return Promise.resolve().then(function(){
                let options = {
                    regKey: LINE_PAY_PREAPPROVED_REGKEY,
                    productName: LINE_PAY_PREAPPROVED_PRODUCT_NAME,
                    amount: LINE_PAY_PREAPPROVED_AMOUNT,
                    currency: LINE_PAY_PREAPPROVED_CURRENCY,
                    orderId: orderId,
                    capture: false
                }
                return pay.confirmPreapprovedPay(options);
            }).then(function(response){
                let options = {
                    amount: 1,
                    currency: "JPY",
                    transactionId: response.info.transactionId
                }
                return pay.capture(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
            });
        });
    });

    describe("Void with correct parameters.", function(){
        it("should void authorization.", function(){
            this.timeout(TIMEOUT);
            let orderId = uuid();
            return Promise.resolve().then(function(){
                let options = {
                    regKey: LINE_PAY_PREAPPROVED_REGKEY,
                    productName: LINE_PAY_PREAPPROVED_PRODUCT_NAME,
                    amount: LINE_PAY_PREAPPROVED_AMOUNT,
                    currency: LINE_PAY_PREAPPROVED_CURRENCY,
                    orderId: orderId
                }
                return pay.confirmPreapprovedPay(options);
            }).then(function(response){
                let options = {
                    transactionId: response.info.transactionId
                }
                return pay.voidAuthorization(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
            });
        });
    });
    */
});
