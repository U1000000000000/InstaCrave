import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const PartnerOrders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders/partner`, { withCredentials: true });
      setOrders(res.data.orders);
    } catch (error) {
      console.error('Error fetching partner orders');
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { status }, { withCredentials: true });
      fetchOrders();
    } catch (error) {
      alert('Error updating order status');
    }
  };

  return (
    <div>
      <h2>Incoming Orders</h2>
      {orders.length === 0 && <p>No orders yet.</p>}
      {orders.map(order => (
        <div key={order._id} style={{marginBottom:16, border:'1px solid #444', borderRadius:8, padding:12}}>
          <p><b>{order.food?.name}</b> - Qty: {order.quantity} - Total: ${order.totalPrice}</p>
          <p>Address: {order.deliveryAddress}</p>
          <p>Status: {order.status}</p>
          <select value={order.status} onChange={e => handleStatusChange(order._id, e.target.value)}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      ))}
    </div>
  );
};

export default PartnerOrders;
