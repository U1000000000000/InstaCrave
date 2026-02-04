/**
 * Order Success Page
 * Confirmation page after successful order placement
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { FiHome } from 'react-icons/fi';
import { MdDeliveryDining } from 'react-icons/md';
import '../../styles/order-result.css';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state;

  useEffect(() => {
    if (!orderData) {
      navigate('/user/home');
    }
  }, [orderData, navigate]);

  if (!orderData) return null;

  return (
    <div className="order-result-page success">
      <div className="result-content">
        <div className="result-icon success">
          <FaCheckCircle />
        </div>

        <h1>Order Placed Successfully!</h1>
        <p className="result-message">
          Thank you for your order. We're preparing your delicious food!
        </p>



        <div className="result-actions">
          <button 
            className="primary-btn"
            onClick={() => navigate('/user/orders')}
          >
            <MdDeliveryDining /> View Orders
          </button>
          <button 
            className="secondary-btn"
            onClick={() => navigate('/user/home')}
          >
            <FiHome /> Back to Home
          </button>
        </div>

        <p className="tracking-hint">
          You can track your order status in the Orders section.
        </p>
      </div>
    </div>
  );
};

export default OrderSuccess;
