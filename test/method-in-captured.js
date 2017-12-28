"use strict";

require("dotenv").config();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const debug = require("debug")("bot-express:test");
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
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET
});

describe("Test method in captured status", function(){
    describe("Inquire payment.", function(){
        it("should return result.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    orderId: process.env.LINE_PAYMENT_ORDER_ID
                }
                return pay.inquirePayment(options);
            }).then(function(response){
                response.info[0].should.have.property("transactionId");
                response.info[0].transactionType.should.equal("PAYMENT");
                response.info[0].currency.should.equal("JPY");
                response.info[0].payInfo[0].method.should.equal("BALANCE");
                response.info[0].payInfo[0].amount.should.equal(1);
            })
        });
    });

    describe("Refund payment.", function(){
        it("should get payment refunded.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    transactionId: process.env.LINE_PAYMENT_TRANSACTION_ID
                }
                return pay.refund(options);
            }).then(function(response){
                response.info.should.have.property("refundTransactionId");
            })
        });
    });
});
