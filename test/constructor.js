"use strict";

require("dotenv").config();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const debug = require("debug")("bot-express:test");
const line_pay = require("../module/line-pay.js")

chai.use(chaiAsPromised);
let should = chai.should();

describe("Test constructor", function(){
    describe("Instantiate missing required parameter.", function(){
        it("should throw error.", function(){
            try {
                let pay = new line_pay({
                    //channelId: process.env.LINE_PAY_CHANNEL_ID,
                    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
                    isSandbox: true
                });
            } catch (e){
                e.should.be.instanceOf(Error);
                e.should.have.property("message").and.equal(`Required parameter channelId is missing.`);
            }
        });
    });

    describe("Instantiate with invalid parameter.", function(){
        it("should throw error.", function(){
            try {
                let pay = new line_pay({
                    channelId: process.env.LINE_PAY_CHANNEL_ID,
                    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
                    isSandbox: true,
                    invalidParam: true
                });
            } catch (e){
                e.should.be.instanceOf(Error);
                e.should.have.property("message").and.equal(`invalidParam is not a valid parameter.`);
            }
        });
    });

    describe("Instantiate for sandbox with correct parameter.", function(){
        it("should return result.", function(){
            let pay = new line_pay({
                channelId: process.env.LINE_PAY_CHANNEL_ID,
                channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
                isSandbox: true
            });
            pay.should.have.property("headers").and.deep.equal({
                "X-LINE-ChannelId": process.env.LINE_PAY_CHANNEL_ID,
                "X-LINE-ChannelSecret": process.env.LINE_PAY_CHANNEL_SECRET
            });
            pay.apiHostname.should.equal("sandbox-api-pay.line.me");
        });
    });

    describe("Instantiate for production with correct parameter.", function(){
        it("should return result.", function(){
            let pay = new line_pay({
                channelId: process.env.LINE_PAY_CHANNEL_ID,
                channelSecret: process.env.LINE_PAY_CHANNEL_SECRET
            });
            pay.apiHostname.should.equal("api-pay.line.me");
        });
    });
});
