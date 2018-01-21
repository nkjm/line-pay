"use strict";

require("dotenv").config();

const app = require("express")();

app.listen(process.env.PORT || 5000, () => {
    console.log(`server is listening to ${process.env.PORT || 5000}...`);
});

const router_with_middleware = require("./sample-router/with-middleware");
const router_without_middleware = require("./sample-router/without-middleware");
app.use("/pay/w", router_with_middleware);
app.use("/pay/wo", router_without_middleware);
