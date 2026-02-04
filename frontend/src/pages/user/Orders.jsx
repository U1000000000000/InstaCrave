
import React, { useEffect, useState, useRef } from 'react';
import { useProtectedRequest } from '../../hooks/useProtectedRequest';
import { useWebSocket } from '../../context/WebSocketContext';
import api from '../../services/api';
import { API_BASE_URL } from '../../config';
import { API_ENDPOINTS } from '../../constants';
import '../../styles/profile.css';

const FINAL_STATES = ['delivered', 'cancelled'];
const ACTIVE_STATES = ['pending', 'confirmed', 'preparing', 'ready'];

const Orders = () => {
  const { on: onWebSocketEvent } = useWebSocket();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('current');
  const [statusUpdateNotification, setStatusUpdateNotification] = useState(null);
  const underlineContainerRef = useRef(null);
  const currentRef = useRef(null);
  const pastRef = useRef(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  const { data, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useProtectedRequest(
    () => api.get(API_ENDPOINTS.ORDERS.USER_ORDERS),
    []
  );
  useEffect(() => {
    let ordersArr = [];
    if (Array.isArray(data?.data)) {
      ordersArr = data.data;
    } else if (Array.isArray(data?.data?.orders)) {
      ordersArr = data.data.orders;
    }
    setOrders(ordersArr);
  }, [data]);

  // WebSocket: Listen for order status updates (real-time)
  useEffect(() => {
    const cleanup = onWebSocketEvent('order:statusUpdated', (orderData) => {
      console.log('Real-time order status update:', orderData);
      
      // Show notification
      setStatusUpdateNotification(orderData);
      
      // Auto-dismiss notification after 5 seconds
      setTimeout(() => setStatusUpdateNotification(null), 5000);
      
      // Refresh orders to get updated status
      refetchOrders();
    });

    return cleanup;
  }, [onWebSocketEvent, refetchOrders]);

  useEffect(() => {
    const updateUnderline = () => {
      let ref = activeTab === 'current' ? currentRef : pastRef;
      if (ref && ref.current && underlineContainerRef.current) {
        const tabRect = ref.current.getBoundingClientRect();
        const containerRect = underlineContainerRef.current.getBoundingClientRect();
        const extra = 12;
        setUnderline({
          left: tabRect.left - containerRect.left - extra / 2 + underlineContainerRef.current.scrollLeft,
          width: tabRect.width + extra
        });
      }
    };
    updateUnderline();
    window.addEventListener('resize', updateUnderline);
    const container = underlineContainerRef.current;
    if (container) container.addEventListener('scroll', updateUnderline);
    return () => {
      window.removeEventListener('resize', updateUnderline);
      if (container) container.removeEventListener('scroll', updateUnderline);
    };
  }, [activeTab, orders]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.ORDERS.USER_ORDERS}`, { withCredentials: true });
      let ordersArr = [];
      if (Array.isArray(res?.data?.data)) {
        ordersArr = res.data.data;
      } else if (Array.isArray(res?.data?.data?.orders)) {
        ordersArr = res.data.data.orders;
      }
      setOrders(ordersArr);
    } catch (error) {
      setOrders([]);
      if (error?.response?.data?.message) {
        alert('Error: ' + error.response.data.message);
      } else {
        alert('Error fetching orders. Please try again.');
      }
      console.error('Error fetching orders', error);
    }
  };

  const currentOrders = orders.filter(o => !FINAL_STATES.includes(o.status));
  const pastOrders = orders.filter(o => FINAL_STATES.includes(o.status));

  return (
    <main className="profile-page">

      <div className="d-flex align-center gap-4 mb-4 mt-2">
        <h2 style={{
          fontWeight: 700,
          fontSize: '2.1rem',
          color: 'var(--color-text)',
          letterSpacing: '-1px',
          paddingLeft: '2px',
          margin: 0
        }}>My Orders</h2>
      </div>
      <hr className="profile-sep" />

      <div
        ref={underlineContainerRef}
        style={{
          width: '100%',
          margin: '18px 0 0 0',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          position: 'relative',
          minHeight: 40
        }}
        className="profile-tabs-scroll"
      >
        <div style={{ display: 'flex', gap: 0, padding: 0, minWidth: 'min-content', width: '100%' }}>
          <button
            onClick={() => setActiveTab('current')}
            ref={currentRef}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: activeTab === 'current' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'current' ? 700 : 600,
              fontSize: '1.13rem',
              position: 'relative',
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              outline: 'none',
              transition: 'all 0.18s',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}
          >
            <span>Current Orders</span>
          </button>
          <button
            onClick={() => setActiveTab('past')}
            ref={pastRef}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: activeTab === 'past' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'past' ? 700 : 600,
              fontSize: '1.13rem',
              position: 'relative',
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              outline: 'none',
              transition: 'all 0.18s',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}
          >
            <span>Past Orders</span>
          </button>
        </div>
        <div
          style={{
            position: 'absolute',
            left: underline.left,
            bottom: 0,
            height: 3,
            width: underline.width,
            background: 'var(--color-accent)',
            borderRadius: 2,
            transition: 'all 0.18s',
            pointerEvents: 'none'
          }}
        />
      </div>

      {activeTab === 'current' && (
        currentOrders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, width: '100%' }}>
            <div className="empty-icon">📦</div>
            <p className="empty-text">No current orders</p>
          </div>
        ) : (
          <div className="orders-grid">
            {currentOrders.map(order => (
              <div key={order._id} className={`order-card status-${order.status}`}>
                <div className="order-card-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <a href={`/food-partner/${order.restaurant || order.foodPartner}`} style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>
                    <img
                      src={order.foodPartnerProfileImage || 'https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210'}
                      alt={order.restaurantName || order.foodPartnerName}
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-accent)', background: '#232428' }}
                    />
                  </a>
                  <div className="order-food-info" style={{ flex: 1 }}>
                    <h4 className="order-food-name" style={{ marginBottom: 2 }}>
                      {order.items && order.items.length > 0 ? (
                        <span style={{ fontWeight: 700, fontSize: '1.08rem' }}>Cart Order</span>
                      ) : (
                        <a href={`/reels/${order.foodId}?partnerId=${order.foodPartnerId}`} style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>
                          {order.foodName}
                        </a>
                      )}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1.01rem', color: 'var(--color-text-secondary)' }}>From</span>
                      <a href={`/food-partner/${order.restaurant || order.foodPartner}`} style={{ color: 'var(--color-accent)', textDecoration: 'underline', fontWeight: 700 }}>{order.restaurantName || order.foodPartnerName}</a>
                    </div>
                    <div style={{ fontSize: '0.98rem', color: 'var(--color-text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span role="img" aria-label="pin">📍</span>
                      <span>{order.deliveryAddress}</span>
                    </div>
                  </div>
                  <div className="order-total" style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: '1.35rem' }}>
                    {(() => {
                      if (typeof order.total === 'number' && order.total > 0) return `$${order.total.toFixed(2)}`;
                      if (typeof order.totalPrice === 'number' && order.totalPrice > 0) return `$${order.totalPrice.toFixed(2)}`;
                      if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                        const sum = order.items.reduce((acc, item) => acc + (item.subtotal || (item.price * item.quantity) || 0), 0);
                        return `$${sum.toFixed(2)}`;
                      }
                      return '$0.00';
                    })()}
                  </div>
                </div>
                  <div className="order-details">
                    <div className="order-detail-row">
                      <span className="detail-text">Order ID: {order._id.slice(-8)}</span>
                    </div>
                    <div className="order-detail-row">
                      <span className="detail-text">Placed: {new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="order-detail-row" style={{ marginTop: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.01rem', background: 'var(--color-bg-secondary)', borderRadius: 8, overflow: 'hidden' }}>
                          <thead>
                            <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                              <th style={{ textAlign: 'left', padding: '6px 10px' }}>Item</th>
                              <th style={{ textAlign: 'center', padding: '6px 10px' }}>Qty</th>
                              <th style={{ textAlign: 'right', padding: '6px 10px' }}>Price</th>
                              <th style={{ textAlign: 'right', padding: '6px 10px' }}>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map(item => (
                              <tr key={item.food}>
                                <td style={{ padding: '6px 10px' }}>
                                  <a href={`/reels/${item.food}`} style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>{item.foodName}</a>
                                </td>
                                <td style={{ textAlign: 'center', padding: '6px 10px' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', padding: '6px 10px' }}>${item.price.toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '6px 10px' }}>${item.subtotal.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                <div className="order-card-footer" style={{ justifyContent: 'flex-end' }}>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'past' && (
        pastOrders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, width: '100%' }}>
            <div className="empty-icon">📦</div>
            <p className="empty-text">No past orders</p>
          </div>
        ) : (
          <div className="orders-grid">
            {pastOrders.map(order => (
              <div key={order._id} className={`order-card status-${order.status}`}>
                <div className="order-card-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <a href={`/food-partner/${order.foodPartnerId}`} style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>
                    <img
                      src={order.foodPartnerProfileImage || 'https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210'}
                      alt={order.foodPartnerName}
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-accent)', background: '#232428' }}
                    />
                  </a>
                  <div className="order-food-info" style={{ flex: 1 }}>
                    <h4 className="order-food-name" style={{ marginBottom: 2 }}>
                      <a href={`/reels/${order.foodId}?partnerId=${order.foodPartnerId}`} style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>
                        {order.foodName}
                      </a>
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1.01rem', color: 'var(--color-text-secondary)' }}>From</span>
                      <a href={`/food-partner/${order.foodPartnerId}`} style={{ color: 'var(--color-accent)', textDecoration: 'underline', fontWeight: 700 }}>{order.foodPartnerName}</a>
                    </div>
                    <div style={{ fontSize: '0.98rem', color: 'var(--color-text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span role="img" aria-label="pin">📍</span>
                      <span>{order.foodPartnerAddress}</span>
                    </div>
                  </div>
                  <div className="order-total" style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: '1.35rem' }}>
                    {order.items && order.items.length > 0
                      ? (() => {
                          let total = Number(order.total);
                          if (!total) {
                            total = order.items.reduce((sum, item) => sum + (item.subtotal || (item.quantity * item.price) || 0), 0);
                          }
                          return `$${total.toFixed(2)}`;
                        })()
                      : `$${(order.totalPrice || 0).toFixed(2)}`}
                  </div>
                </div>
                <div className="order-details">
                  <div className="order-detail-row">
                    <span className="detail-text">Address: {order.deliveryAddress}</span>
                  </div>
                  {order.items && order.items.length > 0 ? (
                    <div className="order-detail-row" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      {order.items.map((item, idx) => (
                        <span key={idx} style={{ fontSize: '0.98rem' }}>
                          <a href={`/reels/${item.food}`} style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>
                            {item.foodName}
                          </a> × {item.quantity} × ${(item.price || 0).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="order-detail-row">
                      <span className="detail-text">Qty: {order.quantity}</span>
                    </div>
                  )}
                  <div className="order-detail-row">
                    <span className="detail-text">Order ID: {order._id.slice(-8)}</span>
                  </div>
                </div>
                <div className="order-card-footer" style={{ justifyContent: 'flex-end' }}>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </main>
  );
};

export default Orders;