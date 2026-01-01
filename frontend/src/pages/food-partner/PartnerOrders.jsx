import React from 'react';
import { API_ENDPOINTS } from '../../constants';
import api from '../../services/api';
import { useProtectedRequest } from '../../hooks/useProtectedRequest';


const PartnerOrders = () => {
  const { data, loading, error, refetch } = useProtectedRequest(
    () => api.get(API_ENDPOINTS.ORDERS.PARTNER_ORDERS),
    []
  );
  let orders = [];
  if (Array.isArray(data?.data)) {
    orders = data.data;
  } else if (Array.isArray(data?.data?.orders)) {
    orders = data.data.orders;
  }

  const handleStatusChange = async (orderId, status) => {
    try {
      const res = await api.put(`/api/v1/orders/${orderId}/status`, { status });
      if (res?.data?.message) {
        alert(res.data.message);
      }
      refetch();
    } catch (error) {
      if (error?.response?.data?.message) {
        alert('Error: ' + error.response.data.message);
      } else {
        alert('Error updating order status. Please try again.');
      }
    }
  };

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error loading orders.</div>;
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
