/**
 * Payment Page
 * Payment method selection and order processing
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/payment.css';
import toast from 'react-hot-toast';
import { FaCreditCard, FaWallet, FaMoneyBillWave } from 'react-icons/fa';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to continue');
      navigate('/user/login');
      return;
    }

    // Don't show cart empty error if order was successful
    if (cart.items.length === 0 && !orderSuccess) {
      toast.error('Your cart is empty');
      navigate('/user/cart');
      return;
    }

    if (!location.state?.deliveryAddress) {
      toast.error('Please provide delivery address');
      navigate('/user/checkout');
      return;
    }

    setDeliveryAddress(location.state.deliveryAddress);
  }, [isAuthenticated, cart.items.length, location.state, navigate, orderSuccess]);

  const handlePayment = async () => {
    if (!cart._id) {
      toast.error('Cart not found. Please add items to your cart.');
      navigate('/user/cart');
      return;
    }
    if (!deliveryAddress) {
      toast.error('Delivery address missing');
      navigate('/user/checkout');
      return;
    }

    setProcessing(true);

    try {
      // Step 1: Initiate payment
      const paymentPayload = {
        cartId: cart._id,
        amount: cart.subtotal,
        paymentMethod,
        deliveryAddress,
      };

      // Add payment method specific data
      if (paymentMethod === 'card') {
        paymentPayload.cardData = {
          cardNumber: '4111111111111111', // Mock card for testing
          cardholderName: 'Test User',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123',
          billingZipCode: '12345',
        };
      } else if (paymentMethod === 'wallet') {
        paymentPayload.walletData = {
          walletId: 'test_wallet_123',
          pinCode: '1234',
        };
      } else if (paymentMethod === 'upi') {
        paymentPayload.upiData = {
          upiId: 'testuser@upi',
          pin: '1234',
        };
      }

      const paymentInitResponse = await api.post('/api/v1/payments/initiate', paymentPayload);
      const paymentId = paymentInitResponse.data.data.paymentId;

      // Step 2: Mock payment processing (in production, this would redirect to payment gateway)
      // For now, we'll simulate a successful payment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Process payment and create order
      const processPayload = { paymentId };
      if (paymentMethod === 'card') {
        const { cardNumber, expiryMonth, expiryYear } = paymentPayload.cardData;
        processPayload.cardData = {
          cardNumber,
          expiryMonth,
          expiryYear,
          last4Digits: cardNumber.slice(-4),
          brand: 'Visa', // or detect from cardNumber if needed
        };
      }
      const processResponse = await api.post('/api/v1/payments/process', processPayload);

      const order = processResponse.data.data.order;

      // Step 4: Mark order as successful (prevents cart empty error)
      setOrderSuccess(true);

      // Step 5: Clear cart
      await clearCart();

      // Step 6: Navigate to success page
      navigate('/user/order-success', { 
        state: { 
          orderId: order._id,
          orderNumber: order.orderNumber,
          total: order.totalAmount,
        } 
      });

      toast.success('Order placed successfully!');
    } catch (err) {
      console.error('Payment failed:', err);
      const errorMessage = err.response?.data?.message || 'Payment failed. Please try again.';
      toast.error(errorMessage);
      
      // Navigate to failure page
      navigate('/user/order-failure', { 
        state: { 
          error: errorMessage 
        } 
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!deliveryAddress) {
    return (
      <div className="payment-page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-header">
        <button className="back-btn" onClick={() => navigate('/user/checkout')} disabled={processing}>
          <span>←</span>
        </button>
        <h1>Payment</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      <div className="payment-content">
        <section className="delivery-summary">
          <h2>Delivery Address</h2>
          <div className="address-card">
            <p className="address">{deliveryAddress}</p>
          </div>
        </section>

        <section className="payment-methods">
          <h2>Payment Method</h2>
          <div className="method-options">
            <label className={`method-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={processing}
              />
              <div className="method-content">
                <FaCreditCard className="method-icon" />
                <div className="method-text">
                  <span className="method-name">Card</span>
                  <span className="method-desc">Credit or Debit Card</span>
                </div>
              </div>
            </label>

            <label className={`method-option ${paymentMethod === 'upi' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="upi"
                checked={paymentMethod === 'upi'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={processing}
              />
              <div className="method-content">
                <FaWallet className="method-icon" />
                <div className="method-text">
                  <span className="method-name">UPI</span>
                  <span className="method-desc">Google Pay, PhonePe, Paytm</span>
                </div>
              </div>
            </label>

            <label className={`method-option ${paymentMethod === 'cash_on_delivery' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="cash_on_delivery"
                checked={paymentMethod === 'cash_on_delivery'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={processing}
              />
              <div className="method-content">
                <FaMoneyBillWave className="method-icon" />
                <div className="method-text">
                  <span className="method-name">Cash on Delivery</span>
                  <span className="method-desc">Pay when you receive</span>
                </div>
              </div>
            </label>
          </div>
        </section>

        <section className="order-summary">
          <h2>Order Summary</h2>
          <div className="summary-items">
            {cart.items.map(item => (
              <div key={item.food || item.foodItem || item._id} className="summary-item">
                <span>{item.foodName || item.foodItemName || item.name || 'Item'} × {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="summary-totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${cart.subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Fee</span>
              <span className="free">Free</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${cart.subtotal.toFixed(2)}</span>
            </div>
          </div>
        </section>

        <button 
          className="pay-btn" 
          onClick={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <>
              <LoadingSpinner /> Processing Payment...
            </>
          ) : (
            `Place Order • $${cart.subtotal.toFixed(2)}`
          )}
        </button>

        <p className="payment-note">
          By placing this order, you agree to our terms and conditions.
        </p>
      </div>
    </div>
  );
};

export default Payment;
