"use strict";

require("dotenv").config();

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

describe("Test method in preapproved status", function(){
    describe("Check preapproved payment with valid regKey.", function(){
        it("should return result.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    regKey: LINE_PAY_PREAPPROVED_REGKEY
                }
                return pay.checkPreapprovedPay(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
            })
        });
    });

    describe("Check preapproved payment with invalid regKey.", function(){
        it("should return result.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    regKey: "RRRRRRRRRRRRRRR"
                }
                return pay.checkPreapprovedPay(options);
            }).catch(function(e){
                e.returnCode.should.equal("1190");
            })
        });
    });

    describe("Confirm preapproved payment with valid regkey.", function(){
        it("should process payment.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    regKey: LINE_PAY_PREAPPROVED_REGKEY,
                    productName: LINE_PAY_PREAPPROVED_PRODUCT_NAME,
                    amount: LINE_PAY_PREAPPROVED_AMOUNT,
                    currency: LINE_PAY_PREAPPROVED_CURRENCY,
                    orderId: uuid()
                }
                return pay.confirmPreapprovedPay(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
                response.info.should.have.property("transactionId");
            })
        });
    });

    describe("Confirm preapproved payment with invalid regkey.", function(){
        it("should return error.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    regKey: "RRRRRRRRRRRRRRR",
                    productName: LINE_PAY_PREAPPROVED_PRODUCT_NAME,
                    amount: LINE_PAY_PREAPPROVED_AMOUNT,
                    currency: LINE_PAY_PREAPPROVED_CURRENCY,
                    orderId: uuid()
                }
                return pay.confirmPreapprovedPay(options);
            }).catch(function(e){
                e.returnCode.should.equal("1190");
            })
        });
    });

    describe("Expire preapproved payment with invalid regkey.", function(){
        it("should return error.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    regKey: "RRRRRRRRRRRRRRR"
                }
                return pay.expirePreapprovedPay(options);
            }).catch(function(e){
                e.returnCode.should.equal("1190");
            })
        });
    });

    /*
    describe("Expire preapproved payment with valid regkey.", function(){
        it("should expire preapproved payment.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    regKey: LINE_PAY_PREAPPROVED_REGKEY
                }
                return pay.expirePreapprovedPay(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
            })
        });
    });
    */
});
