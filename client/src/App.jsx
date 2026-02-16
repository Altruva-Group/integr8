import React from 'react'
import Dashboard from './pages/Dashboard'
import { Route, Routes } from 'react-router'
import Blocks from './pages/Blocks'
import ConductTransaction from './pages/ConductTransaction'
import TransactionPool from './pages/TransactionPool'
import Documentation from './pages/Documentations'
import Whitepaper from './pages/Whitepaper'
import Nav from './components/Nav'
import TokenDashboard from './pages/Token'
import NFTDashboard from './pages/NFT'
import CoinDashboard from './pages/Coin'

const App = () => {
  return (
    <div className='App'>
      <div style={{margin: "0px auto 50px auto"}}>
      <Nav />
      </div>
      <Routes>
        {/* <Route path='/dashboard' element={<Dashboard />} /> */}
        <Route path='/' element={<Dashboard />} />
        <Route path='/blocks' element={<Blocks />} />
        <Route path='/conduct-transaction' element={<ConductTransaction/>} />
        <Route path='/transaction-pool' element={<TransactionPool/>} />
        <Route path='/docs' element={<Documentation/>} />
        <Route path='/whitepaper' element={<Whitepaper/>} />
        <Route path='/coin/*' element={<CoinDashboard/>} />
        <Route path='/token/*' element={<TokenDashboard/>} />
        <Route path='/nft/*' element={<NFTDashboard/>} />
      </Routes>
    </div>
  )
}

export default App
