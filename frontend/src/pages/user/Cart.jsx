/**
 * Cart Page
 * Displays shopping cart items with quantity controls and price summary
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FaTrash, FaMinus, FaPlus, FaShoppingBag } from 'react-icons/fa';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/cart.css';
import toast from 'react-hot-toast';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, loading, updateItemQuantity, removeItem, clearCart } = useCart();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [removingItems, setRemovingItems] = useState(new Set());
  const [updatingItems, setUpdatingItems] = useState(new Set());

  const handleQuantityChange = async (itemId, currentQuantity, delta) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity < 1) return;

    setUpdatingItems(prev => new Set(prev).add(itemId));
    const result = await updateItemQuantity(itemId, newQuantity);
    setUpdatingItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    if (!result.success) {
      toast.error(result.error || 'Failed to update quantity');
    }
  };

  const handleRemoveItem = async (itemId, itemName) => {
    setRemovingItems(prev => new Set(prev).add(itemId));
    const result = await removeItem(itemId);
    setRemovingItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    if (result.success) {
      toast.success(`${itemName} removed from cart`);
    } else {
      toast.error(result.error || 'Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your cart?')) return;

    const result = await clearCart();
    if (result.success) {
      toast.success('Cart cleared');
    } else {
      toast.error(result.error || 'Failed to clear cart');
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Please login to proceed with checkout');
      navigate('/user/login');
      return;
    }
    navigate('/user/checkout');
  };

  if (loading && cart.items.length === 0) {
    return (
      <div className="cart-page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        marginTop: '18px',
        paddingLeft: 'var(--space-6)',
        paddingRight: 'var(--space-6)'
      }}>
        <h2 style={{
          fontWeight: 700,
          fontSize: '2.1rem',
          color: 'var(--color-text)',
          letterSpacing: '-1px',
          margin: 0,
          padding: 0
        }}>Cart</h2>
        {cart.items.length > 0 && (
          <button className="clear-btn" onClick={handleClearCart}>
            Clear
          </button>
        )}
      </div>
      <hr className="profile-sep" style={{margin: '0 var(--space-6)'}} />

      <div className="cart-scroll-area">
        {cart.items.length === 0 && !location.state?.orderSuccess ? (
          <div className="cart-empty">
            <div className="empty-icon">
              <FaShoppingBag />
            </div>
            <h2>Your cart is empty</h2>
            <p>Add some delicious items to get started!</p>
            <button className="browse-btn" onClick={() => navigate('/user/home')}>
              Browse Food
            </button>
          </div>
        ) : (
          <div className="cart-items">
            {cart.items.map((item, index) => (
              <div
                key={`${typeof item.food === 'object' && item.food !== null ? item.food._id : item.food}-${index}`}
                className="cart-item"
              >
                <div className="item-details">
                  <h3>{item.foodName}</h3>
                  {item.customization && Object.keys(item.customization).length > 0 && (
                    <div className="item-customization">
                      {Object.entries(item.customization).map(([key, value]) => (
                        <span key={key} className="custom-tag">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="item-actions">
                    <div className="quantity-controls">
                      <button
                        onClick={() => handleQuantityChange((item.food && item.food._id) ? item.food._id : item.food, item.quantity, -1)}
                        disabled={updatingItems.has((item.food && item.food._id) ? item.food._id : item.food) || item.quantity <= 1}
                        className="qty-btn"
                      >
                        <FaMinus />
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange((item.food && item.food._id) ? item.food._id : item.food, item.quantity, 1)}
                        disabled={updatingItems.has((item.food && item.food._id) ? item.food._id : item.food)}
                        className="qty-btn"
                      >
                        <FaPlus />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemoveItem((item.food && item.food._id) ? item.food._id : item.food, item.foodName)}
                      disabled={removingItems.has((item.food && item.food._id) ? item.food._id : item.food)}
                      className="remove-btn"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div className="item-price">
                  <span className="price">${(item.price * item.quantity).toFixed(2)}</span>
                  {item.quantity > 1 && (
                    <span className="unit-price">${item.price.toFixed(2)} each</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.items.length > 0 && (
        <div className="cart-summary fixed-bottom">
          <div className="summary-row">
            <span>Subtotal ({cart.itemCount} items)</span>
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

          <button className="checkout-btn" onClick={handleCheckout}>
            Proceed to Checkout
          </button>

          {!isAuthenticated && (
            <p className="login-hint">Login to save your cart and checkout</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Cart;
