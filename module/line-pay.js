"use strict";

require("dotenv").config()

const debug = require("debug")("line-pay:module")
const lossless_json = require("lossless-json")
const api_version = "v3"
const Error = require("./line-pay-error.js")
const crypto = require("crypto")
let request = require("request")
const Promise = require("bluebird")
Promise.promisifyAll(request)

/**
@class
*/
class LinePay {
    /**
    @constructor
    @param {Object} options
    @param {String} options.channelId - LINE Channel Id.
    @param {String} options.channelSecret - LINE Channel secret.
    @param {String} [options.proxyUrl] - URL of proxy.
    @param {String} [options.hostname] - Hostname of LINE Pay API. Nomarlly, it is automatically set depeding on isSandbox parameter.
    @param {Boolean} [options.isSandbox=false] - If the environemt is sandbox, set true
    @param {Object} [options.sessionOptions] - Option object for express-session. Refer to https://github.com/expressjs/session for detail.
    */
    constructor(options){
        const required_params = ["channelId", "channelSecret"];
        const optional_params = ["proxyUrl", "hostname", "isSandbox", "sessionOptions"];

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
            "Content-Type": "application/json"
        }

        this.sessionOptions = options.sessionOptions || {
            secret: options.channelSecret,
            resave: false,
            saveUninitialized: false
        }

        // Set proxy.
        if (options.proxyUrl){
            request = request.defaults({'proxy': options.proxyUrl});
            Promise.promisifyAll(request);
        }
    }

    /**
     * Add signature to header.
     * @method 
     * @param {*} headers
     * @param {String} path
     * @param {String} body
     */
    sign(headers, path, body){
        const signed_headers = JSON.parse(JSON.stringify(headers))
        const nonce = String(Date.now())
        signed_headers["X-LINE-Authorization-Nonce"] = nonce
        signed_headers["X-LINE-Authorization"] = crypto.createHmac('sha256', this.channelSecret).update(this.channelSecret + path + body + nonce).digest('base64');
        return signed_headers
    }


    /**
     * Method to request payment.
     * @method
     * @param {Object} options - Request body.
     */
    request(options){
        const path = `/${api_version}/payments/request`
        const url = `https://${this.apiHostname}${path}`
        const body = JSON.stringify(options)
        const headers = this.sign(this.headers, path, body)

        debug(`Going to reserve payment...`);
        return request.postAsync({
            url: url,
            headers: headers,
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
     * Wrapper function of request. This is for backward compatibility.
     * @deprecated
     * @method
     * @param {Object} options  - Request body.
     */
    reserve(options){
        return this.request(options)
    }

    /**
     * Method to confirm payment
     * @method
     * @param {Object} options - Object which contains parameters.
     * @param {String} options.transactionId - Transaction id returned from reserve API.
     * @param {Number} options.amount - Payment amount.
     * @param {String} options.currency - Currency following ISO2117. Supported values are USD, JPY, TWD and THB.
     */
    confirm(options){
        const required_params = ["transactionId", "amount", "currency"];
        const optional_params = [];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!param in options){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        const path = `/${api_version}/payments/${options.transactionId}/confirm`
        const url = `https://${this.apiHostname}${path}`;
        const body = JSON.stringify({
            amount: options.amount,
            currency: options.currency
        })
        const headers = this.sign(this.headers, path, body)
        debug(`Going to confirm payment of transaction: ${options.transactionId}...`);
        return request.postAsync({
            url: url,
            headers: headers,
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
     * Method to confirm preapproved payment
     * @method
     * @param {Object} options - Object which contains parameters.
     * @param {String} options.regKey - Key which is returned from reserve API.
     * @param {String} options.productName - Product name.
     * @param {Number} options.amount - Payment amount.
     * @param {String} options.currency - Payment currency.
     * @param {String} options.orderId - Order id which specified in reserve API.
     * @param {Boolean} [options.capture=true] - Set true to capture payment simultaneously.
     */
    payPreapproved(options){
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

        const path = `/${api_version}/payments/preapprovedPay/${options.regKey}/payment`
        const url = `https://${this.apiHostname}${path}`;
        delete options.regKey;
        const body = JSON.stringify(options);
        const headers = this.sign(this.headers, path, body)
        debug(`Going to execute preapproved payment of orderId: ${options.orderId}...`);
        return request.postAsync({
            url: url,
            headers: headers,
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
     * Wrapper method of payPreapproved for backward compatibility.
     * @method
     * @deprecated 
     * @param {Object} options 
     */
    confirmPreapprovedPay(options){
        return this.payPreapproved(options)
    }

    /**
     * Method to check the availability of preapproved payment.
     * @method
     * @param {Object} options - Object which contains parameters.
     * @param {String} options.regKey - Key which is returned in reserve API.
     * @param {Boolean} [options.creditCardAuth=false] - Set true to execute authorization payment in minimum amount by registered credit card.
     */
    checkRegKey(options){
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
     * Wrapper method of checkRegKey for backward compatibility.
     * @method
     * @deprecated
     * @param {Object} options
     */
    checkPreapprovedPay(options){
        return this.checkRegKey(options)
    }

    /**
     * Method to expire preapproved payment.
     * @method
     * @param {Object} options - Object which contains parameters.
     * @param {String} options.regKey - Key which is returned by reserve API.
     */
    expireRegKey(options){
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

        const path = `/${api_version}/payments/preapprovedPay/${options.regKey}/expire`
        const url = `https://${this.apiHostname}${path}`;
        const headers = this.sign(this.headers, path, body)
        debug(`Going to expire of preapproved payment for regKey: ${options.regKey}...`);
        return request.postAsync({
            url: url,
            headers: headers,
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
     * Wrapper method of expireRegKey for backward compatibility.
     * @method
     * @deprecated
     * @param {Object} options
     */
    expirePreapprovedPay(options){
        return this.expireRegKey(options)
    }

    /**
     * Method to void authorized payment.
     * @method
     * @param {Object} options - Object which contains parameters.
     * @param {String} options.transactionId - Transaction id to void.
     */
    void(options){
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

        const path = `/${api_version}/payments/authorizations/${options.transactionId}/void`
        const url = `https://${this.apiHostname}${path}`;
        const headers = this.sign(this.headers, path, body)
        debug(`Going to void of authorized payment for transaction id: ${options.transactionId}...`);
        return request.postAsync({
            url: url,
            headers: headers,
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
     * Wrapper method of void for backward compatibility.
     * @method
     * @deprecated
     * @param {Object} options
     */
    voidAuthorization(options){
        return this.void(options)
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
     * Method to capture payment
     * @method
     * @param {Object} options - Object which contains parameters.
     * @param {String} options.transactionId - Transaction id returned from reserve API. *While it is described that data type should be number, javascript cannot handle the scale of transactionId so please set string for this parameter.
     * @param {Number} options.amount - Payment amount.
     * @param {String} options.currency - Currency following ISO2117. Supported values are USD, JPY, TWD and THB.
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

        const path = `/${api_version}/payments/authorizations/${options.transactionId}/capture`
        const url = `https://${this.apiHostname}${path}`;
        const body = JSON.stringify({
            amount: options.amount,
            currency: options.currency
        });
        const headers = this.sign(this.headers, path, body)
        debug(`Going to capture payment...`);
        delete body.transactionId;
        return request.postAsync({
            url: url,
            headers: headers,
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
     * Method to inquire payment.
     * @param {Object} options - Object which contains parameters.
     * @param {String} [options.transactionId] - Transaction id to inquire.
     * @param {String} [options.orderId] - Order id to inquire.
     * @param {String} [options.fields] - Targat field to inquire. Default is all.
     */
    paymentDetails(options){
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
     * Wrapper method of void for backward compatibility.
     * @method
     * @deprecated
     * @param {Object} options
     */
    inquirePayment(options){
        return this.paymentDetails(options)
    }

    /**
     * Method to refund payment
     * @method
     * @param {Object} options - Object which contains parameters.
     * @param {String} options.transactionId - Transaction id to refund.
     * @param {Number} [options.refundAmount] - Amount to refund.
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

        const path = `/${api_version}/payments/${options.transactionId}/refund`
        const url = `https://${this.apiHostname}${path}`;
        const body = JSON.stringify({
            refundAmount: options.refundAmount
        });
        const headers = this.sign(this.headers, path, body)
        debug(`Going to refund payment...`);
        return request.postAsync({
            url: url,
            headers: headers,
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
