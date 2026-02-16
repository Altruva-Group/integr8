import { useEffect, useState } from "react";
import { Button, FormControl, FormGroup } from "react-bootstrap";
// import history from "./../../history";
import signTransaction from "../../utils/signTransaction.js";
import { useNavigate } from "react-router";
import { API } from '../../config';

const ConductTransaction = () => {
	const navigate = useNavigate();

	const [wallet, setWallet] = useState(null);
	const [privateKey, setPrivateKey] = useState(null);
	const [recipient, setRecipient] = useState("");
	const [amount, setAmount] = useState(0);

	useEffect(() => {
		const savedWallet = JSON.parse(localStorage.getItem("wallet"));
		if (!wallet && savedWallet?.publicKey) {
			setWallet(savedWallet.publicKey);
			setPrivateKey(savedWallet.privateKey);
		}
	}, [wallet]);

	const updateRecipient = (e) => {
		e.preventDefault();
		setRecipient(e.target.value);
	};

	const updateAmount = (e) => {
		e.preventDefault();
		setAmount(Number(e.target.value));
	};

	const conductTransaction = async () => {
		if (!amount || !recipient || !wallet || !privateKey) {
			alert("Please fill all fields correctly.");
			return;
		}

		try {
			// Generate the signature asynchronously
			const signature = await signTransaction({
				data: { wallet, recipient, amount, type: "coin", action: "transfer" },
				privateKey
			});

			const response = await fetch(`${API}/coin/transfer`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ wallet, recipient, amount, signature: signature }),
			});

			const data = await response.json();
			alert(data.message || data.type);
			navigate("/transaction-pool");
		} catch (error) {
			console.error("Transaction error:", error);
		}
	};

	return (
		<div className="ConductTransaction">
			<h3>Conduct a Transaction</h3>

			<br />
			<FormGroup>
				<FormControl
					type="text"
					placeholder="Recipient Address"
					value={recipient}
					onChange={updateRecipient}
				/>
			</FormGroup>

			<FormGroup>
				<FormControl
					type="number"
					placeholder="Amount"
					value={amount}
					onChange={updateAmount}
				/>
			</FormGroup>
			<div>
				<Button variant="danger" onClick={conductTransaction}>
					Submit
				</Button>
			</div>
		</div>
	);
};

export default ConductTransaction;
