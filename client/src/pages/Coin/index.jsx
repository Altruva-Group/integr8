import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import TransferCoins from './TransferCoins';
// import StakeCoins from './StakeCoins';
// import UnstakeCoins from './UnstakeCoins';
import WalletBalance from '../../components/WalletBalance';

const CoinDashboard = () => {
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const savedWallet = JSON.parse(localStorage.getItem("wallet"));
    if (!wallet && savedWallet?.publicKey) {
      setWallet(savedWallet);
    }
  }, [wallet]);

  if (!wallet) {
    return (
      <Alert variant="warning">
        Please connect your wallet to access coin features
      </Alert>
    );
  }

  return (
    <div className="container">
      <h2>Coin Dashboard</h2>
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      <WalletBalance address={wallet.publicKey} />

      <div className="navBar">
        <div className="navItem">
          <Link to="/conduct-transaction">Transfer Coins</Link>
        </div>
        {/* <div className="navItem">
          <Link to="/coin/stake">Stake Coins</Link>
        </div>
        <div className="navItem">
          <Link to="/coin/unstake">Unstake Coins</Link>
        </div> */}
      </div>

      {/* <Routes>
        <Route 
          path="/transfer" 
          element={<TransferCoins wallet={wallet} onError={setError} />} 
        />
        <Route 
          path="/stake" 
          element={<StakeCoins wallet={wallet} onError={setError} />} 
        />
        <Route 
          path="/unstake" 
          element={<UnstakeCoins wallet={wallet} onError={setError} />} 
        />
      </Routes> */}
    </div>
  );
};

export default CoinDashboard;
