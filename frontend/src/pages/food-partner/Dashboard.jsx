import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useNavigate } from 'react-router-dom';
import '../../styles/profile.css';
import ConfirmModal from '../../components/ConfirmModal';

const FINAL_STATES = ['delivered', 'cancelled'];
const ACTIVE_STATES = ['pending', 'confirmed', 'preparing', 'ready'];

const Dashboard = () => {
  const [foodItems, setFoodItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [orderFilter, setOrderFilter] = useState('current');
  const [statusFilter, setStatusFilter] = useState('all'); // Filter by specific status
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null); // {orderId, status}
  const [openDropdownOrderId, setOpenDropdownOrderId] = useState(null); // for status dropdown
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    // Poll for new orders every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const fetchData = async () => {
    try {
      const [foodRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/food-partner`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/api/orders/partner`, { withCredentials: true })
      ]);
      setFoodItems(foodRes.data.foodPartner.foodItems || []);
      setOrders(ordersRes.data.orders || []);
    } catch (error) {
      console.error('Error fetching dashboard data');
    }
  };

  const handleStatusChange = (orderId, status) => {
    if (FINAL_STATES.includes(status)) {
      setPendingStatusChange({ orderId, status });
      setModalOpen(true);
    } else {
      updateOrderStatus(orderId, status);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { status }, { withCredentials: true });
      fetchData();
    } catch (error) {
      alert('Error updating order status');
    }
  };

  const confirmFinalState = () => {
    if (pendingStatusChange) {
      updateOrderStatus(pendingStatusChange.orderId, pendingStatusChange.status);
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
                            <h4 className="order-food-name">{order.foodName}</h4>
                            <p className="order-quantity">Qty: {order.quantity} × ${order.totalPrice / order.quantity}</p>
                          </div>
                          <div className="order-total">${order.totalPrice}</div>
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
                            <h4 className="order-food-name">{order.foodName}</h4>
                            <p className="order-quantity">Qty: {order.quantity} × ${order.totalPrice / order.quantity}</p>
                          </div>
                          <div className="order-total">${order.totalPrice}</div>
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
