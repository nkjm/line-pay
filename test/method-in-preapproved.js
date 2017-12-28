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

describe("Test method in preapproved status", function(){
    describe("Check preapproved payment.", function(){
        it("should return result.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    regKey: process.env.LINE_PAY_PREAPPROVED_REGKEY
                }
                return pay.checkPreapprovedPay(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
            })
        });
    });

    describe("Confirm preapproved payment.", function(){
        it("should process payment.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    regKey: process.env.LINE_PAY_PREAPPROVED_REGKEY,
                    productName: process.env.LINE_PAY_PREAPPROVED_PRODUCT_NAME,
                    amount: 1,
                    currency: "JPY",
                    orderId: uuid()
                }
                return pay.confirmPreapprovedPay(options);
            }).then(function(response){
                response.info.should.have.property("transactionId");
            })
        });
    });

    describe("Expire preapproved payment.", function(){
        it("should expire preapproved payment.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    regKey: process.env.LINE_PAY_PREAPPROVED_REGKEY
                }
                return pay.expirePreapprovedPay(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
            })
        });
    });
});
