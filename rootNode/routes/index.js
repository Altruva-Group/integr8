const express = require("express");
// import routes
const blockchainRoutes = require("./blockchain")
const coinRoutes = require("./coin")
const tokenRoutes = require("./token")
const nftRoutes = require("./nft")

const app = express.Router();

app.get("/", (req, res) => {
    res.status(200).json({
        type: "success",
        message: "Welcome to Integr8 Blockchain Node API",
        version: process.env.VERSION,
        env: process.env.ENV,
    });
});

app.use("/blockchain", blockchainRoutes)
app.use("/coin", coinRoutes)
app.use("/tokens", tokenRoutes)
app.use("/nfts", nftRoutes)

module.exports = app