/** TO BE MOVED TO CLIENT SIDE */
import Elliptic from "elliptic";
import cryptoHash from "./cryptoHash.js";

const EC = Elliptic.ec

const ec = new EC("secp256k1");

const signTransaction = ({ data, privateKey }) => {
    const key = ec.keyFromPrivate(privateKey);
    const signature = key.sign(cryptoHash(data), 'base64');
    return signature.toDER('hex');
};

export default signTransaction;

/** CLIENT SIGNING ENDS */