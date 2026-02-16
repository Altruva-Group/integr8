import React from 'react'
import { Link } from 'react-router-dom'

const Nav = () => {
  return (
    <div className="navBar">
        <div className="navItem" style={{width: '10em'}}>
        <Link to="/">Home</Link>
        </div>
        <div className="navItem" style={{width: '10em'}}>
        <Link to="/docs">Documentations</Link>
        </div>
        <div className="navItem" style={{width: '10em'}}>
        <Link to="/whitepaper">White Paper</Link>
        </div>
        <div className="navItem" style={{width: '10em'}}>
        <Link to="/coin">Coins</Link>
        </div>
        <div className="navItem" style={{width: '10em'}}>
        <Link to="/token">Tokens</Link>
        </div>
        <div className="navItem" style={{width: '10em'}}>
        <Link to="/nft">NFTs</Link>
        </div>
    </div>
  )
}

export default Nav
