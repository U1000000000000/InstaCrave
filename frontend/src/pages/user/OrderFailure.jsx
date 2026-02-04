/**
 * Order Failure Page
 * Error page when order placement fails
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTimesCircle, FaHome, FaShoppingCart } from 'react-icons/fa';
import '../../styles/order-result.css';

const OrderFailure = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const error = location.state?.error || 'Something went wrong. Please try again.';

  return (
    <div className="order-result-page failure">
      <div className="result-content">
        <div className="result-icon failure">
          <FaTimesCircle />
        </div>

        <h1>Order Failed</h1>
        <p className="result-message">
          {error}
        </p>

        <div className="result-actions">
          <button 
            className="primary-btn"
            onClick={() => navigate('/user/cart')}
          >
            <FaShoppingCart /> Back to Cart
          </button>
          <button 
            className="secondary-btn"
            onClick={() => navigate('/user/home')}
          >
            <FaHome /> Back to Home
          </button>
        </div>

        <p className="tracking-hint">
          Your cart items are still saved. You can try placing the order again.
        </p>
      </div>
    </div>
  );
};

export default OrderFailure;
