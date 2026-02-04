  // Delete food item using api.js abstraction
  const handleDeleteFood = async (foodId) => {
    try {
      await api.delete(`${API_ENDPOINTS.FOOD.BASE}/${foodId}`);
      refetchFood();
    } catch (error) {
      alert('Error deleting food item');
    }
  };
import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../constants';
import { useNavigate } from 'react-router-dom';
import '../../styles/profile.css';
import ConfirmModal from '../../components/ConfirmModal';
import api from '../../services/api';
import { useProtectedRequest } from '../../hooks/useProtectedRequest';
import { useWebSocket } from '../../context/WebSocketContext';

const FINAL_STATES = ['delivered', 'cancelled'];
const ACTIVE_STATES = ['pending', 'confirmed', 'preparing', 'ready'];

const Dashboard = () => {
  const { on: onWebSocketEvent, isConnected: wsConnected, connectionStatus } = useWebSocket();
  
  // Fetch food items and orders using useProtectedRequest
  const { data: foodPartnerData, loading: foodLoading, error: foodError, refetch: refetchFood } = useProtectedRequest(
    () => api.get(API_ENDPOINTS.FOOD_PARTNER.BASE),
    []
  );
  const { data: ordersData, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useProtectedRequest(
    () => api.get(API_ENDPOINTS.ORDERS.PARTNER_ORDERS),
    []
  );
  
  // State for real-time notification
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  // State for orders - update when ordersData changes
  const [orders, setOrders] = useState([]);
  
  // Update orders state when ordersData changes
  useEffect(() => {
    if (Array.isArray(ordersData?.data)) {
      setOrders(ordersData.data);
    } else if (Array.isArray(ordersData?.data?.orders)) {
      setOrders(ordersData.data.orders);
    }
  }, [ordersData]);
  
  // Defensive: check for correct structure, fallback to empty array
  const foodItems = Array.isArray(foodPartnerData?.data?.foodPartner?.foodItems)
    ? foodPartnerData.data.foodPartner.foodItems
    : (Array.isArray(foodPartnerData?.data?.foodItems) ? foodPartnerData.data.foodItems : []);
  const [activeTab, setActiveTab] = useState('orders');
  const [orderFilter, setOrderFilter] = useState('current');
  const [statusFilter, setStatusFilter] = useState('all'); // Filter by specific status
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null); // {orderId, status}
  const [openDropdownOrderId, setOpenDropdownOrderId] = useState(null); // for status dropdown
  const navigate = useNavigate();

  // No useEffect for fetchData, handled by useProtectedRequest

  // Remove the effect that switches to food-items when foodItems is empty

  // Ensure a sub-tab is always open when switching to Orders tab
  useEffect(() => {
    if (activeTab === 'orders') {
      setOrderFilter(f => (f === 'current' || f === 'past') ? f : 'current');
    }
  }, [activeTab]);

  // Reset status filter when switching between current/past tabs
  useEffect(() => {
    setStatusFilter('all');
  }, [orderFilter]);

  // WebSocket: Listen for new order events (real-time)
  useEffect(() => {
    const cleanup = onWebSocketEvent('order:created', (orderData) => {
      
      // Show notification
      setNewOrderNotification(orderData);
      
      // Auto-dismiss notification after 5 seconds
      setTimeout(() => setNewOrderNotification(null), 5000);
      
      // Refresh orders to get the new order
      refetchOrders();
      
    });

    return cleanup;
  }, [onWebSocketEvent, refetchOrders]);


  const handleStatusChange = async (orderId, status) => {
    if (FINAL_STATES.includes(status)) {
      setPendingStatusChange({ orderId, status });
      setModalOpen(true);
    } else {
      try {
        await api.patch(`${API_ENDPOINTS.ORDERS.CREATE}/${orderId}/status`, { status });
        refetchOrders();
      } catch (error) {
        alert('Error updating order status');
      }
    }
  };

  const confirmFinalState = async () => {
    if (pendingStatusChange) {
      try {
        await api.patch(`${API_ENDPOINTS.ORDERS.CREATE}/${pendingStatusChange.orderId}/status`, { status: pendingStatusChange.status });
        refetchOrders();
      } catch (error) {
        alert('Error updating order status');
      }
      setModalOpen(false);
      setPendingStatusChange(null);
    }
  };

  const cancelFinalState = () => {
    setModalOpen(false);
    setPendingStatusChange(null);
  };

  const getFilteredOrders = () => {
    if (orderFilter === 'all') return orders;
    if (orderFilter === 'active') return orders.filter(o => ACTIVE_STATES.includes(o.status));
    if (orderFilter === 'completed') return orders.filter(o => FINAL_STATES.includes(o.status));
    return orders;
  };

  const getOrderStats = () => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const active = orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status)).length;
    const completed = orders.filter(o => o.status === 'delivered').length;
    return { pending, active, completed };
  };

  const stats = getOrderStats();
  const filteredOrders = getFilteredOrders();
  const activeOrders = filteredOrders.filter(o => ACTIVE_STATES.includes(o.status));
  const completedOrders = filteredOrders.filter(o => FINAL_STATES.includes(o.status));

  return (
    <main className="profile-page">
      {/* Real-time connection status indicator */}
      <div style={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        fontSize: '0.9rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: wsConnected ? '#4caf50' : connectionStatus === 'reconnecting' ? '#ff9800' : '#f44336',
          animation: wsConnected ? 'none' : 'pulse 2s infinite',
        }} />
        <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
          {wsConnected ? 'Live' : connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
        </span>
      </div>

      {/* New order notification toast */}
      {newOrderNotification && (
        <div style={{
          position: 'fixed',
          top: 120,
          right: 20,
          zIndex: 1001,
          maxWidth: 400,
          padding: '16px 20px',
          background: 'linear-gradient(135deg, var(--color-accent) 0%, #ff6b6b 100%)',
          color: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(226, 55, 71, 0.4)',
          animation: 'slideInRight 0.3s ease-out',
          cursor: 'pointer',
        }}
        onClick={() => {
          setActiveTab('orders');
          setOrderFilter('current');
          setNewOrderNotification(null);
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: '2rem' }}>🔔</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
                New Order Received!
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>
                {newOrderNotification.isCartOrder ? (
                  <>
                    {newOrderNotification.items.length === 1 ? (
                      `${newOrderNotification.items[0].foodName} x${newOrderNotification.items[0].quantity}`
                    ) : (
                      `Cart Order (${newOrderNotification.items.length} items)`
                    )}
                  </>
                ) : (
                  `${newOrderNotification.foodName} x${newOrderNotification.quantity}`
                )}
              </div>
              {newOrderNotification.isCartOrder && newOrderNotification.items.length > 1 && (
                <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: 2, maxHeight: 60, overflowY: 'auto' }}>
                  {newOrderNotification.items.map((item, idx) => (
                    <div key={idx}>• {item.foodName} x{item.quantity}</div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>
                {newOrderNotification.isCartOrder
                  ? (() => {
                      let total = Number(newOrderNotification.total);
                      if (!total && Array.isArray(newOrderNotification.items)) {
                        total = newOrderNotification.items.reduce((sum, item) => sum + (item.subtotal || (item.price * item.quantity) || 0), 0);
                      }
                      return `$${total.toFixed(2)}`;
                    })()
                  : `$${(newOrderNotification.totalPrice || 0).toFixed(2)}`}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNewOrderNotification(null);
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2rem',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modalOpen}
        title={pendingStatusChange?.status === 'delivered' ? 'Mark as Delivered?' : 'Cancel Order?'}
        message={
          pendingStatusChange?.status === 'delivered'
            ? 'Once you mark this order as delivered, you cannot change its status anymore.'
            : 'Once you cancel this order, you cannot change its status anymore.'
        }
        onConfirm={confirmFinalState}
        onCancel={cancelFinalState}
      />
      {/* Header - match ProfilePage style */}
      <div className="d-flex align-center justify-between gap-4 mb-4 mt-2">
        <h2 style={{
          fontWeight: 700,
          fontSize: '2.1rem',
          color: 'var(--color-text)',
          letterSpacing: '-1px',
          paddingLeft: '2px',
          margin: 0
        }}>Dashboard</h2>
      </div>
      <hr className="profile-sep" />
      <div style={{marginBottom:'8px',marginTop:'-8px',fontWeight:500,fontSize:'1.08rem',color:'var(--color-text-secondary)'}}>
        Manage your orders and food items
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="tab-badge">{orders.filter(o => o.status === 'pending').length}</span>
          )}
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'food-items' ? 'active' : ''}`}
          onClick={() => setActiveTab('food-items')}
        >
          Food Items
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="dashboard-section">
          {/* Show only the count for the active tab */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', marginTop: '8px', fontWeight: 600, fontSize: '1.08rem', color: 'var(--color-text-secondary)' }}>
            {orderFilter === 'current' && (
              <span>Current Orders: {orders.filter(o => !FINAL_STATES.includes(o.status)).length}</span>
            )}
            {orderFilter === 'past' && (
              <span>Past Orders: {orders.filter(o => FINAL_STATES.includes(o.status)).length}</span>
            )}
          </div>
          <div className="dashboard-section-header">
            {/* Remove 'Incoming Orders' text */}
            <div className="order-tabs">
              <button
                className={`filter-btn ${orderFilter === 'current' ? 'active' : ''}`}
                onClick={() => setOrderFilter('current')}
              >
                Current Orders
              </button>
              <button
                className={`filter-btn ${orderFilter === 'past' ? 'active' : ''}`}
                onClick={() => setOrderFilter('past')}
              >
                Past Orders
              </button>
            </div>
          </div>
          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', justifyContent: 'center' }}>
            <button
              className={`status-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            {orderFilter === 'current' ? (
              ACTIVE_STATES.map(status => (
                <button
                  key={status}
                  className={`status-filter-btn status-${status} ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))
            ) : (
              FINAL_STATES.map(status => (
                <button
                  key={status}
                  className={`status-filter-btn status-${status} ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))
            )}
          </div>
          <div>
            {orderFilter === 'current' && (
              <>
                {orders.filter(o => !FINAL_STATES.includes(o.status) && (statusFilter === 'all' || o.status === statusFilter)).length === 0 ? (
                  <div className="orders-empty-tab">
                    <div className="empty-icon">📭</div>
                    <p className="empty-text">No {statusFilter === 'all' ? 'current' : statusFilter} orders</p>
                  </div>
                ) : (
                  <div className="orders-grid">
                    {orders.filter(o => !FINAL_STATES.includes(o.status) && (statusFilter === 'all' || o.status === statusFilter)).map(order => (
                      <div key={order._id} className={`order-card status-${order.status}${openDropdownOrderId === order._id ? ' dropdown-open' : ''}`}>
                        {/* ...existing code for order card... */}
                        <div className="order-card-header">
                          <div className="order-food-info">
                            {order.items && order.items.length > 0 ? (
                              <>
                                <h4 className="order-food-name">Cart Order ({order.items.length} items)</h4>
                                <p className="order-quantity">
                                  {order.items.map((item, idx) => (
                                    <span key={idx} style={{ display: 'block', fontSize: '0.95rem', marginBottom: '2px' }}>
                                      {item.foodName} × {item.quantity} × ${(item.price || 0).toFixed(2)}
                                    </span>
                                  ))}
                                </p>
                              </>
                            ) : (
                              <>
                                <h4 className="order-food-name">{order.foodName}</h4>
                                <p className="order-quantity">Qty: {order.quantity} × ${(order.totalPrice / order.quantity).toFixed(2)}</p>
                              </>
                            )}
                          </div>
                          <div className="order-total">
                            {order.items && order.items.length > 0
                              ? (() => {
                                  // Use order.total if present and > 0, else sum item subtotals
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
                            <span className="detail-text">Customer: {order.userName || 'Unknown'}</span>
                          </div>
                          <div className="order-detail-row">
                            <span className="detail-text">Address: {order.deliveryAddress}</span>
                          </div>
                          <div className="order-detail-row">
                            <span className="detail-text">Order #{order._id.slice(-6)}</span>
                          </div>
                        </div>
                        <div className="order-card-status-row">
                          <div className="custom-dropdown" style={{ width: '100%', marginTop: 4 }}>
                            <button
                              type="button"
                              className="dropdown-button"
                              style={{ width: '100%', justifyContent: 'space-between', fontSize: '1.08rem', padding: '12px 20px', borderRadius: '50px' }}
                              onClick={() => setOpenDropdownOrderId(openDropdownOrderId === order._id ? null : order._id)}
                              aria-haspopup="true"
                              aria-expanded={openDropdownOrderId === order._id}
                            >
                              <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                              <span style={{ fontSize: '1rem', fontWeight: 700, marginLeft: 8 }}>▼</span>
                            </button>
                            {openDropdownOrderId === order._id && (
                              <div className="dropdown-content" style={{ width: '100%', minWidth: 140 }}>
                                {['pending','confirmed','preparing','ready','delivered','cancelled'].map(s => (
                                  <div
                                    key={s}
                                    className={`dropdown-item${order.status === s ? ' selected' : ''}`}
                                    onClick={() => {
                                      setOpenDropdownOrderId(null);
                                      if (order.status !== s) handleStatusChange(order._id, s);
                                    }}
                                  >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {orderFilter === 'past' && (
              <>
                {orders.filter(o => FINAL_STATES.includes(o.status) && (statusFilter === 'all' || o.status === statusFilter)).length === 0 ? (
                  <div className="orders-empty-tab">
                    <div className="empty-icon">📦</div>
                    <p className="empty-text">No {statusFilter === 'all' ? 'past' : statusFilter} orders</p>
                  </div>
                ) : (
                  <div className="orders-grid">
                    {orders.filter(o => FINAL_STATES.includes(o.status) && (statusFilter === 'all' || o.status === statusFilter)).map(order => (
                      <div key={order._id} className={`order-card status-${order.status}`}>
                        <div className="order-card-header">
                          <div className="order-food-info">
                            {order.items && order.items.length > 0 ? (
                              <>
                                <h4 className="order-food-name">Cart Order ({order.items.length} items)</h4>
                                <p className="order-quantity">
                                  {order.items.map((item, idx) => (
                                    <span key={idx} style={{ display: 'block', fontSize: '0.95rem', marginBottom: '2px' }}>
                                      {item.foodName} × {item.quantity} × ${(item.price || 0).toFixed(2)}
                                    </span>
                                  ))}
                                </p>
                              </>
                            ) : (
                              <>
                                <h4 className="order-food-name">{order.foodName}</h4>
                                <p className="order-quantity">Qty: {order.quantity} × ${(order.totalPrice / order.quantity).toFixed(2)}</p>
                              </>
                            )}
                          </div>
                          <div className="order-total">
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
                            <span className="detail-text">Customer: {order.userName || 'Unknown'}</span>
                          </div>
                          <div className="order-detail-row">
                            <span className="detail-text">Address: {order.deliveryAddress}</span>
                          </div>
                          <div className="order-detail-row">
                            <span className="detail-text">Order #{order._id.slice(-6)}</span>
                          </div>
                        </div>
                        <div className="order-card-status-row">
                          <div style={{ width: '100%', marginTop: 4 }}>
                            <div
                              className="dropdown-button"
                              style={{ 
                                width: '100%', 
                                justifyContent: 'center', 
                                fontSize: '1.08rem', 
                                padding: '12px 20px', 
                                borderRadius: '50px',
                                cursor: 'default',
                                pointerEvents: 'none'
                              }}
                            >
                              <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Food Items Tab */}
      {activeTab === 'food-items' && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h3 className="section-title">Your Menu</h3>
            <button
              className="btn-primary"
              onClick={() => navigate('/create-food')}
            >
              + Add New Item
            </button>
          </div>

          {foodItems.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <p className="empty-text">No food items yet</p>
              <p className="empty-subtext">
                Start by adding your first food item
              </p>
              <button
                className="btn-primary"
                onClick={() => navigate('/create-food')}
                style={{ marginTop: '16px' }}
              >
                Create Food Item
              </button>
            </div>
          )}

          <div className="food-items-grid">
            {foodItems.map(item => (
              <div
                key={item._id}
                className="food-item-card"
                onClick={() => navigate(`/food-partner/dashboard/${item._id}`)}
              >
                <div className="food-item-media">
                  <video
                    src={item.video}
                    className="food-item-video"
                    muted
                    playsInline
                  />
                  {item.isOrderable && (
                    <div className="food-item-badge orderable">
                      ${item.price}
                    </div>
                  )}
                </div>
                <div className="food-item-content">
                  <h4 className="food-item-name">{item.name}</h4>
                  <p className="food-item-desc">{item.description}</p>
                </div>
                <div className="food-item-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
};

export default Dashboard;
