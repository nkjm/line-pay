"use strict";

require("dotenv").config();

const app = require("express")();

app.listen(process.env.PORT || 5000, () => {
    console.log(`server is listening to ${process.env.PORT || 5000}...`);
});

const router_line_pay = require("./sample-router/line-pay");
app.use("/line-pay", router_line_pay);
