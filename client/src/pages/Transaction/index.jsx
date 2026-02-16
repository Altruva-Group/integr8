import React, { useEffect, useState } from 'react'
import { API } from '../../config';

const Transaction = ({transaction}) => {
  const [walletBalance, setWalletBalance] = useState(0);

  const {from, to, amount} = transaction 
  // const {id, type, action, from, to, amount, token, nft, transactionCost} = transaction 
    // const recipients = Object.keys(outputMap)

    useEffect(() => {
      if (from) {
        fetch(`${API}/coin/${from}`)
        .then(response => response.json())
        .then(data =>setWalletBalance(data?.assets?.coins))
      }
    })

  return (
    <div className='Transaction'>
        <div>From: {`${from.substring(0,20)}...`} | Balance: {walletBalance}</div>
        {
            // recipients.map(recipient => (
            //     <div key={recipient}>
            //         To: {`${recipient.substring(0, 20)}...`} | Sent: {outputMap[recipient]}
            //     </div>
            // ))
            <div>
                To: {`${to.substring(0,20)}...`} | 
                Sent: {amount}
            </div>
        }
        
    </div>
  )
}

export default Transaction
