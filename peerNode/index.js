require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {isDevelopment, blockchain} = require("./common")

// import routes
const Routes = require("./routes")

const DEFAULT_PORT = 3001;
const ROOT_NODE_ADDRESS = isDevelopment ? `http://localhost:3000` : `https://intgrx.onrender.com`

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api", Routes);

const syncWithRootState = async () => {
    const response = await fetch(`${ROOT_NODE_ADDRESS}/api/blockchain/blocks`);
    if (response.status === 200) {
        const rootChain = await response.json();
        blockchain.replaceChain({chain: rootChain})
    } else {
        console.error(`Error fetching root chain`)
        return res.status(404).json({
            type: "error",
            message: "Error synchronizing with the Root Node of the blockchain"
        });
    }
}

const PORT = process.env.PORT || DEFAULT_PORT

app.listen(DEFAULT_PORT, () => {
    console.log(`app running on ${process.env.ENV} mode at ` +
        (isDevelopment
            ? `http://localhost:${DEFAULT_PORT}`
            : `https://intgrx.onrender.com/${DEFAULT_PORT}`)
    );

    syncWithRootState();
});
