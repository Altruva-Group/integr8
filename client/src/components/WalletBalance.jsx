import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { API } from '../config';

const WalletBalance = ({ address }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch(`${API}/coin/${address}`);
        const data = await response.json();
        
        if (data.type === 'error') {
          throw new Error(data.message);
        }
        
        setBalance(data.assets);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Refresh every 10s
    
    return () => clearInterval(interval);
  }, [address]);

  if (loading) {
    return <Spinner animation="border" />;
  }

  if (error) {
    return <div className="text-danger">Error loading balance: {error}</div>;
  }

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>Wallet Balance</Card.Title>
        <div>Coins: {balance?.coins || 0}</div>
        <div>Staked Coins: {balance?.stakedCoins || 0}</div>
        <div>Staking Rewards: {balance?.stakingRewards || 0}</div>
      </Card.Body>
    </Card>
  );
};

export default WalletBalance;
