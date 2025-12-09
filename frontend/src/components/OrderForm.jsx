import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { API_ENDPOINTS } from '../constants';

const OrderForm = ({ food, onClose, onOrderPlaced }) => {
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const totalPrice = (food.price * quantity).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.ORDERS.CREATE}`, {
        foodId: food._id,
        quantity,
        deliveryAddress,
      }, { withCredentials: true });
      setSuccess(true);
      onOrderPlaced && onOrderPlaced();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setSuccess(false);
      setError(err?.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-form-modal">
      <div className="order-form-content" style={{maxWidth: 400, width: '100%', padding: 0, overflow: 'hidden'}}>
        {/* Header with food name, description, and food partner info in a single row */}
        <div style={{display: 'flex', alignItems: 'center', gap: 14, background: '#232428', padding: '24px 24px 12px 24px'}}>
          <div style={{flex: 1}}>
            <h2 style={{margin: 0, fontWeight: 700, fontSize: '1.35rem', color: '#fff'}}>{food.name}</h2>
            <div style={{fontSize: '1.01rem', color: 'var(--color-text-secondary)', marginTop: 2, marginBottom: 6}}>{food.description?.slice(0, 60) || ''}</div>
            {food.foodPartner && (
              <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 2}}>
                <img src={food.foodPartner.profileImage || 'https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210'} alt={food.foodPartner.name} style={{width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-accent)'}} />
                <span style={{fontWeight: 600, color: '#fff'}}>{food.foodPartner.name}</span>
                <span style={{fontSize: '0.98rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4}}>
                  <span role="img" aria-label="pin">📍</span>
                  <span>{food.foodPartner.address}</span>
                </span>
              </div>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{padding: '18px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14}}>
          {success && <div style={{color:'var(--color-success, #4caf50)',marginBottom:8, fontWeight: 600}}>Order placed successfully!</div>}
          {error && <div style={{color:'var(--color-accent, #e53935)',marginBottom:8, fontWeight: 600}}>{error}</div>}
          <div style={{display: 'flex', gap: 12}}>
            <div style={{flex: 1}}>
              <label style={{fontWeight: 600, color: '#fff'}}>Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                min="1"
                required
                style={{width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: '#232428', color: '#fff', fontSize: '1.08rem', marginTop: 4}}
              />
            </div>
            <div style={{flex: 2}}>
              <label style={{fontWeight: 600, color: '#fff'}}>Delivery Address</label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                rows={2}
                style={{width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: '#232428', color: '#fff', fontSize: '1.08rem', marginTop: 4, resize: 'vertical'}}
              />
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8}}>
            <div style={{fontWeight: 700, fontSize: '1.13rem', color: '#fff'}}>Total: <span style={{color: 'var(--color-accent)'}}>${totalPrice}</span></div>
            <div style={{display: 'flex', gap: 10}}>
              <button
                type="submit"
                disabled={loading || success}
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '1.08rem',
                  cursor: (loading || success) ? 'not-allowed' : 'pointer',
                  opacity: (loading || success) ? 0.7 : 1
                }}
              >
                {loading ? 'Placing Order...' : 'Pay & Order'}
              </button>
              <button type="button" onClick={onClose} style={{background: 'none', color: 'var(--color-accent)', border: '1.5px solid var(--color-accent)', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: '1.08rem', cursor: 'pointer'}}>Cancel</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;