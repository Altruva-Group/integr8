import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from 'react-bootstrap'
// import history from './../../history'
import Transaction from '../Transaction'
import { API } from '../../config'

const POLL_INTERVAL_MS = 10000

const TransactionPool = () => {
    const navigate = useNavigate();

    const [transactionPoolMap, setTransactionPoolMap] = useState({})
	const [wallet, setWallet] = useState(null);

	useEffect(() => {
		const savedWallet = JSON.parse(localStorage.getItem("wallet"));
		if (!wallet && savedWallet?.publicKey) {
			setWallet(savedWallet.publicKey);
		}
	}, [wallet]);

    const fetchTransactionPoolMap = () => {
        fetch(`${API}/blockchain/blocks/mempool`)
        .then(response => response.json())
        .then(data =>setTransactionPoolMap(data.transactionPool))
    }

    const fetchMineTransactions = () => {
        // Manual trigger kept for backwards compatibility with auto-mining
        fetch(`${API}/blockchain/blocks/mine-transactions`)
        .then(response => {
            if (response.status === 200 || response.status === 302) {
                alert('Transactions included into a block')
                navigate('/blocks')
            } else {
                alert('No transactions to include or the request failed')
            }
        })
    }

    useEffect(() => {
        fetchTransactionPoolMap()

        const fetchPoolMapInterval = setInterval(() => fetchTransactionPoolMap(), POLL_INTERVAL_MS
        )

        return clearInterval(fetchPoolMapInterval)
    }, [])

// console.log({transactionPoolMap})
  return (
    <div className='TransactionPool'>
        <h3>Transaction Pool</h3>
        {
            Object.values(transactionPoolMap).map(transaction => {
                return (
                    <div key={transaction.id}>
                        <hr />
                        <Transaction transaction={transaction} key={transaction.id}/>
                    </div>
                )
            })
        }

        <hr />
        <Button 
            variant='danger'
            onClick={fetchMineTransactions}
        >
            Mine the Transactions
        </Button>
    </div>
  )
}

export default TransactionPool
