const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const http = require('http');
const { Server: WebSocketServer } = require('ws');
const { DEFAULT_PORT, isDevelopment } = require("./global");
const { errorHandlerMiddleware } = require("./middleware/errorHandler.middleware");
const Blockchain = require("./blockchain");
const TransactionMiner = require("./miner");
const TransactionPool = require("./mempool");
const StateDatabase = require("./accounts/stateDatabase");
const PubSub = require("./p2p");
const { setInstances, setPubSub, setTransactionMiner } = require("./common/instances");

// import routes
let Routes;

dotenv.config();


const app = express();

const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: '/p2p' })


// Initialize core components first
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const stateDatabase = new StateDatabase();
// Set blockchain reference in stateDatabase
stateDatabase.setBlockchain(blockchain);

// default accounts
stateDatabase.createAccount("04c631e9b46bfa3d6f19c7c94f76371013860cd66d313cdcf9fcda6e4505c3c3afa543680af67218119063e121e91e0f9d090631608a2adbb24c238583be498314").updateCoins(10000000);
stateDatabase.createAccount("04cc87af256480f37a8e6b01cedefd0b34c5bef47706d9570203db1c0e1ebe1d2f24759ada9d66a56b7f9df99f1fe07496f6aac884cbec03bfc01e198ca9f363f3").updateCoins(1000000);
stateDatabase.createAccount("04bed4edc02f7a9384cfc8560710b69efec89719d8f0fb909dfff935f2d00750aa3420f2f0450ec1a3a48fd6193534a6db2f4b9cb1e3685195a6b3deef6904c9e3http").updateCoins(100000);

// console.log(stateDatabase.getAccount("04c631e9b46bfa3d6f19c7c94f76371013860cd66d313cdcf9fcda6e4505c3c3afa543680af67218119063e121e91e0f9d090631608a2adbb24c238583be498314")) // .getCoins());

// Set instances immediately after creation
setInstances({ 
    blockchainInstance: blockchain, 
    transactionPoolInstance: transactionPool, 
    stateDatabaseInstance: stateDatabase,
});

const pubsub = new PubSub({ 
    blockchain, 
    transactionPool, 
    stateDatabase, 
    wsServer,
    peers: process.env.PEERS ? process.env.PEERS.split(',') : [],
});
setPubSub(pubsub);

const transactionMiner = new TransactionMiner({
    blockchain,
    transactionPool,
    pubsub
});
setTransactionMiner(transactionMiner);

// Move routes initialization after all instances are set
Routes = require("./routes");


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(errorHandlerMiddleware)


app.get("/", (req, res) => {
    res.status(200).json({
        type: "success",
        message: "Welcome to Integr8 Blockchain Node",
        version: process.env.VERSION,
        env: process.env.ENV,
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        type: "success",
        message: "Integr8 Blockchain Node is healthy",
        version: process.env.VERSION,
        env: process.env.ENV,
    });
});

app.use("/api", Routes);

app.use((req, res, next) => {
    res.setTimeout(5000, () => {
        console.error("Request timed out:", req.url);
        res.status(504).json({ error: "Gateway timeout" }).end();
    });
    next();
});

const port = process.env.PORT || DEFAULT_PORT;
// console.log("port:", port)
server.listen(port, () => {
    console.log(`Integr8 server running in ${process.env.ENV} mode at ` +
        (isDevelopment 
            ? `http://localhost:${port}`
            : `https://integr8.onrender.com/api`
        )
    );
});


module.exports = {
    wsServer,
    pubsub,
}