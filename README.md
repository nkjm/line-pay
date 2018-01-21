# Overview

This is unofficial SDK to use LINE Pay inside the node.js based application on top of express framework.

# Getting started

### Create sandbox

Go to [LINE Pay Developers](https://pay.line.me/developers/techsupport/sandbox/creation) and create your sandbox.
You can retrieve Channel Id and Channel Secret Key after successful login to [LINE Pay Console](https://pay.line.me/login). You also need to configure white lists of server ip addresses which access to LINE Pay API.

### Installation

```
$ npm install --save line-pay
```

### Server/Router configuration

Here is extremely basic server configuration to start payment flow.

```javascript
"use strict";

const app = require("express")();
const uuid = require("uuid/v4");
const line_pay = require("line-pay");

const pay = new line_pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
    isSandbox: true
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`server is listening to ${process.env.PORT || 5000}...`);
});

app.use("/pay", pay.middleware({
    productName: "demo product",
    amount: 1,
    currency: "JPY",
    orderId: uuid()
}), (req, res, next) => {
    // Now payment should have been completed.
    res.send("Payment has been completed.");
});
```

When you open browser and access to https://YOUR_HOSTNAME/pay, it starts payment flow by reserving payment and redirect you to authorization screen.

When you approve the payment, you redirect back to https://YOUR_HOSTNAME/pay/confirm and the server actually captures the payment.

You can control the flow by using individual methods like reserve() or confirm() in the SDK.

# Reference

For more methods, refer to [API reference](https://nkjm.github.io/line-pay/LinePay.html).
[Demo & Sample code to use LINE Pay inside chatbot](https://github.com/nkjm/line-pay-in-bot) would be a good reference for Bot developers.

# License

[MIT](./LICENSE)
