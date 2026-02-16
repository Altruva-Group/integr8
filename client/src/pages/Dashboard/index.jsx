import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { API } from '../../config';

const Dashboard = () => {
  const [wallet, setWallet] = useState(null);
  const [address, setAddress] = useState('');
  const [coins, setCoins] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [mintedNfts, setMintedNfts] = useState([]);
  const [unmintedNfts, setUnmintedNfts] = useState([]);
  const [stakedCoins, setStakedCoins] = useState([]);
  const [stakedTokens, setStakedTokens] = useState([]);
  const [stakingRewards, setStakingRewards] = useState(0);
  const [onWalletCreate, setOnWalletCreate] = useState(false);

  useEffect(() => {
    console.log("Wallet from localstorage:", localStorage.getItem('wallet'))
    const storedWallet = JSON.parse(localStorage.getItem('wallet'));
    if (!wallet && storedWallet?.publicKey) {
      setWallet(storedWallet);
    }
  }, [wallet]);

  const handleCreateWallet = () => {
    fetch(`${API}/coin/create`)
      .then((response) => response.json())
      .then((data) => {
        console.log("DATA:", data);
        console.log("Wallet:", data.wallet);
        if (data.wallet) {
          setWallet(data.wallet);
          localStorage.setItem('wallet', JSON.stringify(data.wallet));
          setOnWalletCreate(true);
        }
        else {
          alert(data.message);
          localStorage.removeItem('wallet');
          setOnWalletCreate(false);
        }
      })
      .catch((error) => {
        alert(error.message);
        console.log(error);
      });
  };

  useEffect(() => {
    if (wallet?.publicKey) {
      try {
        fetch(`${API}/coin/${wallet.publicKey}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.assets) {
            setAddress(data.publicKey);
            setCoins(data.assets.coins);
            setTokens(data.assets.tokens);
            setMintedNfts(data.assets.mintedNfts);
            setUnmintedNfts(data.assets.unmintedNfts);
            setStakedCoins(data.assets.stakedCoins);
            setStakedTokens(data.assets.stakedTokens); 
            setStakingRewards(data.assets.stakingRewards);
          }
          else {
            alert(data.message)
            localStorage.removeItem("wallet")
          }
        })
      } catch (error) {
        // alert(error)
        console.error(error)
      }
    }
  }, [wallet]);

  // console.log({wallet})
  // console.log({address})

  return (
    <div>
      <br />
      <div>
        Welcome to the INTEGR8, the `INTEGRATING`` Blockchain.
        <br />
        (This is the First version for our &ldquo;Alpha Testers&rdquo;)
      </div>
      <br />
      {!wallet && (
        <div>
          <Link>
            <Button
              variant="secondary"
              onClick={handleCreateWallet}
              style={{ padding: '7px', backgroundColor: 'green', color: 'black' }}
            >
             Create Wallet
            </Button>
          </Link>
        </div>
      )}
      <br />
      <div className="navBar">
        <div className="navItem">
          <Link to="/blocks">Blocks</Link>
        </div>
        <div className="navItem">
          <Link to="/conduct-transaction">Conduct a Transaction</Link>
        </div>
        <div className="navItem">
          <Link to="/transaction-pool">Transaction Pool</Link>
        </div>
      </div>
      <br />
      {onWalletCreate ? (
        <div className="WalletInfo" style={{marginBottom: "2rem"}}>
          <p style={{color: "red", textTransform: "uppercase"}}>Please save these details. <br /> Your wallet and assets would be lost without them!</p>
          <div>Wallet ID: <br /> {wallet?.id}</div> <br /> 
          <div>Address: <br /> {wallet?.publicKey}</div> <br /> 
          <div>Private Key: <br /> {wallet?.privateKey}</div> <br /> 
          <div>Mnemonics: <br /> {wallet?.mnemonic}</div>
          <br />
          <Link>
            <Button
              variant="secondary"
              onClick={() => setOnWalletCreate(false)} // Fixed handler
              style={{ padding: '7px', backgroundColor: 'red', color: 'white' }}
            >
               Close Wallet Info
            </Button>
          </Link>
        </div>
      ) : (
        wallet ? (
          <div className="WalletInfo">
            <div>Address: {address}</div>
            <div>Coins: {coins}</div>
            <div>Tokens: {tokens.join(', ')}</div>
            <div>NFTs (minted): {mintedNfts.join(', ')}</div> 
            <div>NFTs (unminted): {unmintedNfts.join(', ')}</div>
            <div>Staked Coins: {stakedCoins}</div>
            <div>Staked Tokens: {stakedTokens}</div>
            <div>Staking Rewards: {stakingRewards}</div>
          </div>
        ) : (
          <div>Please create a wallet</div> 
        )
      )}
    </div>
  );
};

export default Dashboard;
