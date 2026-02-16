import CryptoJS from "crypto-js"

const cryptoHash = (...inputs) => {
    const hash = CryptoJS.SHA256(inputs.map(input => JSON.stringify(input)).sort().join(' '));
    return hash.toString(CryptoJS.enc.Hex);
  };

export default cryptoHash;