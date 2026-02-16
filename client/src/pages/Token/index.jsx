import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Routes, Route, 
import { Alert } from 'react-bootstrap';
// import { Button } from 'react-bootstrap';

const TokenDashboard = () => {
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
        Please connect your wallet to access Tokens features
      </Alert>
    );
  }

  return (
    <div>
      <h2>Token Dashboard (under development, but you can connect to the Node server directly.)</h2>
      <div className="navBar">
        <div className="navItem">
          <Link to="/token/create">Create Token</Link>
        </div>
        <div className="navItem">
          <Link to="/token/transfer">Transfer Token</Link>
        </div>
        <div className="navItem">
          <Link to="/token/stake">Stake Token</Link>
        </div>
      </div>

      {/* <Routes>
        <Route path="/create" element={<CreateToken />} />
        <Route path="/transfer" element={<TransferToken />} />
        <Route path="/stake" element={<StakeToken />} />
      </Routes> */}
    </div>
  );
};

export default TokenDashboard;
