import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Routes, Route, 
import { Alert } from 'react-bootstrap';
// import { Button } from 'react-bootstrap';

const NFTDashboard = () => {
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    const savedWallet = JSON.parse(localStorage.getItem("wallet"));
    if (!wallet && savedWallet?.publicKey) {
      setWallet(savedWallet);
    }
  }, [wallet]);

  if (!wallet) {
    return (
      <Alert variant="warning">
        Please connect your wallet to access NFT features
      </Alert>
    );
  }

  return (
    <div>
      <h2>NFT Dashboard (under development, but you can connect to the Node server directly.)</h2>
      <div className="navBar">
        <div className="navItem">
          <Link to="/nft/create">Create NFT</Link>
        </div>
        <div className="navItem">
          <Link to="/nft/mint">Mint NFT</Link>
        </div>
        <div className="navItem">
          <Link to="/nft/transfer">Transfer NFT</Link>
        </div>
      </div>

      {/* <Routes>
        <Route path="/create" element={<CreateNFT />} />
        <Route path="/mint" element={<MintNFT />} />
        <Route path="/transfer" element={<TransferNFT />} />
      </Routes> */}
    </div>
  );
};

export default NFTDashboard;
