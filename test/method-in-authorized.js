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

describe("Test method in authorized status", function(){
    describe("Inquire with correct parameters.", function(){
        it("should return result.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    transactionId: process.env.LINE_PAY_AUTHORIZED_TRANSACTION_ID
                }
                return pay.inquireAuthorization(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
                response.info[0].productName.should.equal("demo product");
            });
        });
    });

    describe("Void with correct parameters.", function(){
        it("should void authorization.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    transactionId: process.env.LINE_PAY_AUTHORIZED_TRANSACTION_ID
                }
                return pay.voidAuthorization(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
            });
        });
    });

    describe("Capture with correct parameters.", function(){
        it("should capture.", function(){
            this.timeout(TIMEOUT);
            return Promise.resolve().then(function(){
                let options = {
                    amount: 1,
                    currency: "JPY",
                    transactionId: process.env.LINE_PAY_AUTHORIZED_TRANSACTION_ID
                }
                return pay.capture(options);
            }).then(function(response){
                response.returnCode.should.equal("0000");
            });
        });
    });

});
