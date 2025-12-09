
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { API_ENDPOINTS } from '../../constants';
import '../../styles/profile.css';

const FINAL_STATES = ['delivered', 'cancelled'];
const ACTIVE_STATES = ['pending', 'confirmed', 'preparing', 'ready'];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('current');
  const underlineContainerRef = useRef(null);
  const currentRef = useRef(null);
  const pastRef = useRef(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  useEffect(() => {
    fetchOrders();
  }, []);

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
      setOrders(res.data.orders);
    } catch (error) {
      console.error('Error fetching orders');
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
                  <div className="order-total" style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: '1.35rem' }}>${order.totalPrice}</div>
                </div>
                <div className="order-details">
                  <div className="order-detail-row">
                    <span className="detail-text">Address: {order.deliveryAddress}</span>
                  </div>
                  <div className="order-detail-row">
                    <span className="detail-text">Qty: {order.quantity}</span>
                  </div>
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
                  <div className="order-total" style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: '1.35rem' }}>${order.totalPrice}</div>
                </div>
                <div className="order-details">
                  <div className="order-detail-row">
                    <span className="detail-text">Address: {order.deliveryAddress}</span>
                  </div>
                  <div className="order-detail-row">
                    <span className="detail-text">Qty: {order.quantity}</span>
                  </div>
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