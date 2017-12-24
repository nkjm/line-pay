# Overview

This is a SDK to use LINE Pay inside the node.js based application on top of express framework.

# Getting started

### Create sandbox account

Go to [LINE Pay Developers](https://pay.line.me/developers/techsupport/sandbox/creation) and create your sandbox.

### Installation

```
$ npm install --save line-pay
```

### Server/Router configuration

```javascript
"use strict";

const app = require("express")();
const uuid = require("uuid/v4");

let line_pay
if (process.env.NODE_ENV == "development"){
    line_pay = require("./module/line-pay");
} else {
    line_pay = require("line-pay");
}

const pay = new line_pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`server is listening to ${process.env.PORT || 5000}...`);
});

app.get("/", (req, res) => {
    res.redirect("/pay");
});

app.use("/pay", pay.middleware({
    productName: "demo product",
    amount: 1,
    currency: "JPY",
    orderId: uuid()
}));
```

# Reference

For more detailed configuration, refer to [API reference](https://nkjm.github.io/line-pay/LinePay.html).

# License

[MIT](./LICENSE)
