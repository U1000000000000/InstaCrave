/**
 * Checkout Page
 * Delivery address form and cart summary for order placement
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/checkout.css';
import toast from 'react-hot-toast';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, validateCart, loading: cartLoading } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validationIssues, setValidationIssues] = useState(null);

  const [formData, setFormData] = useState({
    addressLine1: '',
    deliveryInstructions: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to checkout');
      navigate('/user/login');
      return;
    }

    if (cart.items.length === 0) {
      toast.error('Your cart is empty');
      navigate('/user/cart');
    }
  }, [isAuthenticated, cart.items.length, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.addressLine1.trim()) newErrors.addressLine1 = 'Address is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    setLoading(true);
    setValidationIssues(null);

    // Validate cart
    const validation = await validateCart();

    if (!validation.success) {
      setLoading(false);
      if (validation.details?.issues) {
        setValidationIssues(validation.details.issues);
        toast.error('Some items in your cart have issues');
      } else {
        toast.error(validation.error || 'Cart validation failed');
      }
      return;
    }

    setLoading(false);

    // Proceed to payment with address data
    let deliveryAddress = formData.addressLine1.trim();
    if (formData.deliveryInstructions && formData.deliveryInstructions.trim()) {
      deliveryAddress += ' | Instructions: ' + formData.deliveryInstructions.trim();
    }
    navigate('/user/payment', { 
      state: { deliveryAddress } 
    });
  };

  if (cartLoading && cart.items.length === 0) {
    return (
      <div className="checkout-page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <button className="back-btn" onClick={() => navigate('/user/cart')}>
          <span>←</span>
        </button>
        <h1>Checkout</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      <div className="checkout-content">
        <form onSubmit={handleSubmit} className="checkout-form">

          <section className="form-section">
            <h2>Delivery Address</h2>
            <div className="form-group">
              <label htmlFor="addressLine1">Address *</label>
              <input
                type="text"
                id="addressLine1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                className={errors.addressLine1 ? 'error' : ''}
                placeholder="Street address, Apartment, etc."
              />
              {errors.addressLine1 && <span className="error-text">{errors.addressLine1}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="deliveryInstructions">Delivery Instructions (Optional)</label>
              <textarea
                id="deliveryInstructions"
                name="deliveryInstructions"
                value={formData.deliveryInstructions}
                onChange={handleChange}
                placeholder="E.g., Ring the bell, Leave at door, etc."
                rows="3"
              />
            </div>
          </section>

          {validationIssues && validationIssues.length > 0 && (
            <div className="validation-issues">
              <h3>⚠️ Cart Issues</h3>
              {validationIssues.map((issue, idx) => (
                <div key={idx} className="issue-item">
                  <strong>{issue.itemName}</strong>: {issue.issue}
                </div>
              ))}
              <button 
                type="button"
                onClick={() => navigate('/user/cart')}
                className="fix-cart-btn"
              >
                Fix Cart Issues
              </button>
            </div>
          )}

          <div className="order-summary">
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
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Validating...' : 'Proceed to Payment'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
