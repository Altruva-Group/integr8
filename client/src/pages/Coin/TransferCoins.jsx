import React, { useState } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import signTransaction from '../../utils/signTransaction';
import { API } from '../../config';

const TransferCoins = ({ wallet, onError }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
  });
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    
    if (!form.checkValidity()) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    setLoading(true);
    try {
      const signature = await signTransaction({
        data: { 
          wallet: wallet.publicKey, 
          recipient: formData.recipient, 
          amount: Number(formData.amount),
          type: "coin",
          action: "transfer" 
        },
        privateKey: wallet.privateKey
      });

      const response = await fetch(`${API}/coin/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet.publicKey,
          recipient: formData.recipient,
          amount: Number(formData.amount),
          signature
        }),
      });

      const data = await response.json();
      
      if (data.type === 'error') {
        throw new Error(data.message);
      }

      navigate('/transaction-pool');
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transfer-form">
      <h3>Transfer Coins</h3>
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Recipient Address</Form.Label>
          <Form.Control
            required
            type="text"
            value={formData.recipient}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              recipient: e.target.value
            }))}
            pattern="^[0-9a-fA-F]{128}$"
            placeholder="Enter recipient's public key"
          />
          <Form.Control.Feedback type="invalid">
            Please provide a valid recipient address
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Amount</Form.Label>
          <Form.Control
            required
            type="number"
            min="0.0001"
            step="0.0001"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              amount: e.target.value
            }))}
            placeholder="Enter amount to transfer"
          />
          <Form.Control.Feedback type="invalid">
            Please enter a valid amount
          </Form.Control.Feedback>
        </Form.Group>

        <Button 
          type="submit" 
          variant="primary" 
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
              <span className="ms-2">Processing...</span>
            </>
          ) : (
            'Transfer'
          )}
        </Button>
      </Form>
    </div>
  );
};

export default TransferCoins;
