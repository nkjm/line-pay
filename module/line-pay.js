"use strict";

require("dotenv").config();

const router = require("express").Router();
const session = require("express-session");
const debug = require("debug")("line-pay:module");
const request = require("request");
const lossless_json = require("lossless-json");
const api_version = "v2";

let Error = require("./line-pay-error.js");
Promise = require("bluebird");
Promise.promisifyAll(request);

/**
@class
*/
class LinePay {
    /**
    @constructor
    @param {Object} options
    @param {String} options.channelId - LINE Channel Id
    @param {String} options.channelSecret - LINE Channel secret
    @param {String} [options.hostname] - Hostname of LINE Pay API. Nomarlly, it is automatically set depeding on isSandbox parameter.
    @param {Boolean} [options.isSandbox=false] - If the environemt is sandbox, set true
    @param {Object} [options.sessionOptions] - Option object for express-session. Refer to https://github.com/expressjs/session for detail.
    */
    constructor(options){
        const required_params = ["channelId", "channelSecret"];
        const optional_params = ["hostname", "isSandbox", "sessionOptions"];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        this.channelId = options.channelId;
        this.channelSecret = options.channelSecret;
        this.isSandbox = options.isSandbox || false;
        if (this.isSandbox){
            this.apiHostname = "sandbox-api-pay.line.me";
        } else {
            this.apiHostname = "api-pay.line.me";
        }
        this.apiHostname = options.hostname || this.apiHostname;

        this.headers = {
            "X-LINE-ChannelId": this.channelId,
            "X-LINE-ChannelSecret": this.channelSecret,
            "Content-Type": "application/json"
        }

        this.sessionOptions = options.sessionOptions || {
            secret: options.channelSecret,
            resave: false,
            saveUninitialized: false
        }
        router.use(session(this.sessionOptions));
    }

    /**
    Middleware to start payment flow.
    @method
    @param {Object} options - Object which contains parameters.
    @param {String} options.productName - Product name.
    @param {String} [options.productImageUrl] - URL of product image.
    @param {Number} options.amount - Payment amount.
    @param {String} options.currency - Currency following ISO4218.
    @param {String} [options.mid] - LINE member ID.
    @param {String} [options.oneTimeKey] - One time key.
    @param {String} [options.confirmUrl] - URL to transition after the payment approval. Default is CURRENT_PROTOCOL://CURRENT_HOSTNAME/MIDDLEWARE_MOUNT_POINT/confirm
    @param {String} [options.confirmUrlType="CLIENT"] - Confirm URL type. In this middleware, supported values are CLIENT only.
    @param {Boolean} [options.checkConfirmUrlBrowswer=false] - If check browser on transitioning to confirm URL.
    @param {String} [options.cancelUrl] - URL to transition after cancellation of payment.
    @param {String} [options.packageName] - String to prevent phising in Android.
    @param {String} options.orderId - Unique id of the order transaction.
    @param {String} [options.deliveryPlacePhone] - Contact of payment receiver.
    @param {String} [options.payType="NORMAL"] - Payment type. Supported values are NORMAL and PREAPPROVED.
    @param {String} [options.langCd] - Language to display payment pending screen.
    @param {Boolean} [options.capture=true] - Set true if like to complete payment right after successful of confirm API call.
    */
    middleware(options){
        router.get("/", (req, res, next) => {
            options.confirmUrl = options.confirmUrl || `https://${req.hostname}${req.baseUrl}/confirm`;

            req.session.productName = options.productName;
            req.session.orderId = options.orderId;
            req.session.amount = options.amount;
            req.session.currency = options.currency;
            req.session.confirmUrl = options.confirmUrl;

            this.reserve(options).then((response) => {
                req.session.transactionId = response.info.transactionId;

                if (true){ // TBD
                    //debug(`Redirecting to payment URL: ${response.info.paymentUrl.web}...`);
                    return res.redirect(response.info.paymentUrl.web);
                } else {
                    //debug(`Redirecting to payment URL: ${response.info.paymentUrl.app}...`);
                    return res.redirect(response.info.paymentUrl.app);
                }
            }).catch((exception) => {
                return res.status(400).json(exception);
            })
        });

        router.get("/confirm", (req, res, next) => {
            if (!req.query || !req.query.transactionId){
                return res.status(400).send("Transaction id not found.");
            }

            let transactionId = req.query.transactionId;
            this.confirm({
                transactionId: transactionId,
                amount: req.session.amount,
                currency: req.session.currency
            }).then((response) => {
                next();
            }).catch((exception) => {
                return res.status(500).json(exception);
            });
        });

        return router;
    }

    /**
    Method to reserve payment
    @method
    @param {Object} options - Object which contains parameters.
    @param {String} options.productName - Product name.
    @param {String} [options.productImageUrl] - URL of product image.
    @param {Number} options.amount - Payment amount.
    @param {String} options.currency - Currency following ISO4218.
    @param {String} [options.mid] - LINE member ID.
    @param {String} [options.oneTimeKey] - One time key.
    @param {String} options.confirmUrl - URL to transition after the payment approval.
    @param {String} [options.confirmUrlType="CLIENT"] - Confirm URL type. Supported values are CLIENT and SERVER.
    @param {Boolean} [options.checkConfirmUrlBrowswer=false] - If check browser on transitioning to confirm URL.
    @param {String} [options.cancelUrl] - URL to transition after cancellation of payment.
    @param {String} [options.packageName] - String to prevent phising in Android.
    @param {String} options.orderId - Unique id of the order transaction.
    @param {String} [options.deliveryPlacePhone] - Contact of payment receiver.
    @param {String} [options.payType="NORMAL"] - Payment type. Supported values are NORMAL and PREAPPROVED.
    @param {String} [options.langCd] - Language to display payment pending screen.
    @param {Boolean} [options.capture=true] - Set true if like to complete payment right after successful of confirm API call.
    */
    reserve(options){
        const required_params = ["productName", "amount", "currency", "confirmUrl", "orderId"];
        const optional_params = ["productImageUrl", "mid", "oneTimeKey", "confirmUrlType", "checkConfirmUrlBrowser", "cancelUrl", "packageName", "deliveryPlacePhone", "payType", "langCd", "capture"];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments/request`;
        let body = JSON.stringify(options);
        debug(`Going to reserve payment...`);
        return request.postAsync({
            url: url,
            headers: this.headers,
            body: body
        }).then((response) => {
            let body = lossless_json.parse(response.body, this._lossless_converter);

            if (body.returnCode && body.returnCode == "0000"){
                debug(`Completed reserving payment.`);
                debug(body);
                return body;
            } else {
                debug(`Failed to reserve payment.`);
                debug(body);
                return Promise.reject(new Error(body));
            }
        })
    }

    /**
    Method to confirm payment
    @method
    @param {Object} options - Object which contains parameters.
    @param {String} options.transactionId - Transaction id returned from reserve API.
    @param {Number} options.amount - Payment amount.
    @param {String} options.currency - Currency following ISO2117. Supported values are USD, JPY, TWD and THB.
    */
    confirm(options){
        const required_params = ["transactionId", "amount", "currency"];
        const optional_params = [];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments/${options.transactionId}/confirm`;
        let body = JSON.stringify({
            amount: options.amount,
            currency: options.currency
        })
        debug(`Going to confirm payment of transaction: ${options.transactionId}...`);
        return request.postAsync({
            url: url,
            headers: this.headers,
            body: body
        }).then((response) => {
            let body = lossless_json.parse(response.body, this._lossless_converter);

            if (body.returnCode && body.returnCode == "0000"){
                debug(`Completed confirming payment.`);
                debug(body);
                return body;
            } else {
                debug(`Failed to confirm payment.`);
                debug(body);
                return Promise.reject(new Error(body));
            }
        })
    }


    /**
    Method to confirm preapproved payment
    @method
    @param {Object} options - Object which contains parameters.
    @param {String} options.regKey - Key which is returned from reserve API.
    @param {String} options.productName - Product name.
    @param {Number} options.amount - Payment amount.
    @param {String} options.currency - Payment currency.
    @param {String} options.orderId - Order id which specified in reserve API.
    @param {Boolean} [options.capture=true] - Set true to capture payment simultaneously.
    */
    confirmPreapprovedPay(options){
        const required_params = ["regKey", "productName", "amount", "currency", "orderId"];
        const optional_params = ["capture"];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments/preapprovedPay/${options.regKey}/payment`;
        delete options.regKey;
        let body = JSON.stringify(options);
        debug(`Going to execute preapproved payment of orderId: ${options.orderId}...`);
        return request.postAsync({
            url: url,
            headers: this.headers,
            body: body
        }).then((response) => {
            let body = lossless_json.parse(response.body, this._lossless_converter);

            if (body.returnCode && body.returnCode == "0000"){
                debug(`Completed executing preapproved payment.`);
                debug(body);
                return body;
            } else {
                debug(`Failed to execute preapproved payment.`);
                debug(body);
                return Promise.reject(new Error(body));
            }
        })
    }

    /**
    Method to check the availability of preapproved payment.
    @method
    @param {Object} options - Object which contains parameters.
    @param {String} options.regKey - Key which is returned in reserve API.
    @param {Boolean} [options.creditCardAuth=false] - Set true to execute authorization payment in minimum amount by registered credit card.
    */
    checkPreapprovedPay(options){
        const required_params = ["regKey"];
        const optional_params = ["creditCardAuth"];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments/preapprovedPay/${options.regKey}/check`;
        if (options.creditCardAuth === true){
            url += "?creditCardAuth=true";
        }
        debug(`Going to check availability of preapproved payment for regKey: ${options.regKey}...`);
        return request.getAsync({
            url: url,
            headers: this.headers,
            json: true
        }).then((response) => {
            if (response.body.returnCode && response.body.returnCode == "0000"){
                debug(`Completed checking availability.`);
                debug(response.body);
                return response.body;
            } else {
                debug(`Failed to check availability.`);
                debug(response.body);
                return Promise.reject(new Error(response.body));
            }
        })
    }

    /**
    Method to expire preapproved payment.
    @method
    @param {Object} options - Object which contains parameters.
    @param {String} options.regKey - Key which is returned by reserve API.
    */
    expirePreapprovedPay(options){
        const required_params = ["regKey"];
        const optional_params = [""];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments/preapprovedPay/${options.regKey}/expire`;
        debug(`Going to expire of preapproved payment for regKey: ${options.regKey}...`);
        return request.postAsync({
            url: url,
            headers: this.headers,
            json: true
        }).then((response) => {
            if (response.body.returnCode && response.body.returnCode == "0000"){
                debug(`Completed expiring preapproved payment.`);
                debug(response.body);
                return response.body;
            } else {
                debug(`Failed to expire preapprove payment.`);
                debug(response.body);
                return Promise.reject(new Error(response.body));
            }
        })
    }

    /**
    Method to void authorized payment.
    @method
    @param {Object} options - Object which contains parameters.
    @param {String} options.transactionId - Transaction id to void.
    */
    voidAuthorization(options){
        const required_params = ["transactionId"];
        const optional_params = [""];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments/authorizations/${options.transactionId}/void`;
        debug(`Going to void of authorized payment for transaction id: ${options.transactionId}...`);
        return request.postAsync({
            url: url,
            headers: this.headers,
            json: true
        }).then((response) => {
            if (response.body.returnCode && response.body.returnCode == "0000"){
                debug(`Completed void payment.`);
                debug(response.body);
                return response.body;
            } else {
                debug(`Failed to void payment.`);
                debug(response.body);
                return Promise.reject(new Error(response.body));
            }
        })
    }

    /**
    Method to inquire authorization.
    @param {Object} options - Object which contains parameters.
    @param {String} [options.transactionId] - Transaction id to inquire. *While it is described that data type should be number, javascript cannot handle the scale of transactionId so please set string for this parameter.
    @param {String} [options.orderId] - Order id to inquire.
    */
    inquireAuthorization(options){
        const required_params = [];
        const optional_params = ["transactionId", "orderId"];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments/authorizations?`;
        if (options.transactionId) url += `transactionId=${options.transactionId}`;
        if (options.orderId) url += `orderId=${options.orderId}`;
        debug(`Going to inquire authorization...`);
        return request.getAsync({
            url: url,
            headers: this.headers
        }).then((response) => {
            let body = lossless_json.parse(response.body, this._lossless_converter);

            if (body.returnCode && body.returnCode == "0000"){
                debug(`Completed inquiring authorization.`);
                debug(body);
                return body;
            } else {
                debug(`Failed to inquiring authorization.`);
                debug(body);
                return Promise.reject(new Error(body));
            }
        })
    }

    /**
    Method to capture payment
    @method
    @param {Object} options - Object which contains parameters.
    @param {String} options.transactionId - Transaction id returned from reserve API. *While it is described that data type should be number, javascript cannot handle the scale of transactionId so please set string for this parameter.
    @param {Number} options.amount - Payment amount.
    @param {String} options.currency - Currency following ISO2117. Supported values are USD, JPY, TWD and THB.
    */
    capture(options){
        const required_params = ["transactionId", "amount", "currency"];
        const optional_params = [];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments/authorizations/${options.transactionId}/capture`;
        let body = JSON.stringify({
            amount: options.amount,
            currency: options.currency
        });
        debug(`Going to capture payment...`);
        delete body.transactionId;
        return request.postAsync({
            url: url,
            headers: this.headers,
            body: body
        }).then((response) => {
            let body = lossless_json.parse(response.body, this._lossless_converter);

            if (body.returnCode && body.returnCode == "0000"){
                debug(`Completed capturing payment.`);
                debug(body);
                return body;
            } else {
                debug(`Failed to capture payment.`);
                debug(body);
                return Promise.reject(new Error(body));
            }
        })
    }

    /**
    Method to inquire payment.
    @param {Object} options - Object which contains parameters.
    @param {String} [options.transactionId] - Transaction id to inquire.
    @param {String} [options.orderId] - Order id to inquire.
    */
    inquirePayment(options){
        const required_params = [];
        const optional_params = ["transactionId", "orderId"];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments?`;
        if (options.transactionId) url += `transactionId=${options.transactionId}`;
        if (options.orderId) url += `orderId=${options.orderId}`;
        debug(`Going to inquire payment...`);
        return request.getAsync({
            url: url,
            headers: this.headers
        }).then((response) => {
            let body = lossless_json.parse(response.body, this._lossless_converter);

            if (body.returnCode && body.returnCode == "0000"){
                debug(`Completed inquiring payment.`);
                debug(body);
                return body;
            } else {
                debug(`Failed to inquiring payment.`);
                debug(body);
                return Promise.reject(new Error(body));
            }
        })
    }

    /**
    Method to refund payment
    @method
    @param {Object} options - Object which contains parameters.
    @param {String} options.transactionId - Transaction id to refund.
    @param {Number} [options.refundAmount] - Amount to refund.
    */
    refund(options){
        const required_params = ["transactionId"];
        const optional_params = ["refundAmount"];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        let url = `https://${this.apiHostname}/${api_version}/payments/${options.transactionId}/refund`;
        let body = JSON.stringify({
            refundAmount: options.refundAmount
        });
        debug(`Going to refund payment...`);
        return request.postAsync({
            url: url,
            headers: this.headers,
            body: body
        }).then((response) => {
            let body = lossless_json.parse(response.body, this._lossless_converter);

            if (body.returnCode && body.returnCode == "0000"){
                debug(`Completed capturing payment.`);
                debug(body);
                return body;
            } else {
                debug(`Failed to refund payment.`);
                debug(body);
                return Promise.reject(new Error(body));
            }
        })
    }

    /**
    Retriever for lossless_json.parse() to convert overflowed number as string.
    */
    _lossless_converter(key, value){
        if (value && value.isLosslessNumber) {
            try {
                return value.valueOf();
            } catch (e) {
                return value.value;
            }
        } else {
            return value;
        }
    }

}

module.exports = LinePay;
