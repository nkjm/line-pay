"use strict";

require("dotenv").config();

// Required constant
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
    hostname: process.env.LINE_PAY_HOSTNAME,
    isSandbox: false
});

describe("Test method in captured status", function(){
    describe("Inquire payment with invalid order id.", function(){
        it("should return error.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    orderId: "0000000-0000-0000-0000-000000000000"
                }
                return pay.inquirePayment(options);
            }).catch(function(e){
                e.returnCode.should.equal("1150");
            })
        });
    });

    describe("Inquire payment with valid order id.", function(){
        it("should return result.", function(){
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
                    orderId: orderId
                }
                return pay.inquirePayment(options);
            }).then(function(response){
                response.info[0].should.have.property("transactionId");
                (typeof response.info[0].transactionId).should.equal("string");
                response.info[0].transactionType.should.equal("PAYMENT");
                response.info[0].currency.should.equal("JPY");
                response.info[0].payInfo[0].method.should.equal("BALANCE");
                response.info[0].payInfo[0].amount.should.equal(1);
            })
        });
    });

    // If we can retrieve transaction id from order id, we can enable this test.
    describe("Refund payment.", function(){
        it("should get payment refunded.", function(){
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
                return pay.refund(options);
            }).then(function(response){
                response.info.should.have.property("refundTransactionId");
                (typeof response.info.refundTransactionId).should.equal("string");
            })
        });
    });
});
