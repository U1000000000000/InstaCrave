/**
 * Cart Context
 * Manages shopping cart state with localStorage persistence and backend sync
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

const CART_STORAGE_KEY = 'instacrave_cart';

export const CartProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [cart, setCart] = useState({ items: [], itemCount: 0, subtotal: 0 });
  const [loading, setLoading] = useState(false);

  // Fetch cart from backend when authenticated
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      console.log('📡 Fetching cart from API...');
      const response = await api.get('/api/v1/cart');
      const backendCart = response.data.data;
      
      console.log('📦 Received cart from backend:', backendCart);
      
      // If backend returns empty cart or no cart, clear the _id
      if (!backendCart || !backendCart._id || backendCart.items.length === 0) {
        setCart({
          items: [],
          itemCount: 0,
          subtotal: 0,
        });
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
          items: [],
          itemCount: 0,
          subtotal: 0,
        }));
      } else {
        setCart({
          _id: backendCart._id,
          items: backendCart.items || [],
          itemCount: backendCart.itemCount || 0,
          subtotal: backendCart.totalPrice || 0,
        });
        
        // Sync to localStorage
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
          _id: backendCart._id,
          items: backendCart.items || [],
          itemCount: backendCart.itemCount || 0,
          subtotal: backendCart.totalPrice || 0,
        }));
      }
    } catch (err) {
      console.error('❌ Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load cart on mount and when authentication changes
  useEffect(() => {
    console.log('🔄 Cart sync effect triggered:', { isAuthenticated });
    if (isAuthenticated) {
      // User is authenticated - fetch cart from backend
      console.log('🔐 User authenticated, fetching cart from backend...');
      fetchCart();
    } else {
      // User is not authenticated - load from localStorage if available
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          console.log('💾 Loading cart from localStorage:', parsed);
          setCart(parsed);
        } catch (err) {
          console.error('Failed to parse saved cart:', err);
        }
      } else {
        console.log('📭 No saved cart in localStorage');
      }
    }
  }, [isAuthenticated, fetchCart]);

  // Merge local cart with backend cart on login
  const mergeCart = async (localItems) => {
    if (!isAuthenticated || !localItems || localItems.length === 0) return;
    
    try {
      setLoading(true);
      const response = await api.post('/api/v1/cart/merge', { items: localItems });
      const mergedCart = response.data.data;
      if (!mergedCart) {
        setCart({ items: [], itemCount: 0, subtotal: 0 });
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: [], itemCount: 0, subtotal: 0 }));
      } else {
        setCart({
          _id: mergedCart._id,
          items: mergedCart.items || [],
          itemCount: mergedCart.itemCount || 0,
          subtotal: mergedCart.totalPrice || 0,
        });
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
          _id: mergedCart._id,
          items: mergedCart.items || [],
          itemCount: mergedCart.itemCount || 0,
          subtotal: mergedCart.totalPrice || 0,
        }));
      }
    } catch (err) {
      console.error('Failed to merge cart:', err);
      // Fallback to fetching cart
      fetchCart();
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addItem = async (foodItem, quantity = 1, customization = {}) => {
    // For backend, only send foodId and quantity
    const newItem = {
      foodId: foodItem._id,
      quantity,
      // Optionally send customization/metadata if backend supports it
      // customization,
    };

    if (isAuthenticated) {
      try {
        setLoading(true);
        const response = await api.post('/api/v1/cart/items', newItem);
        const updatedCart = response.data.data;
        setCart({
          _id: updatedCart._id,
          items: updatedCart.items || [],
          itemCount: updatedCart.itemCount || 0,
          subtotal: updatedCart.totalPrice || 0,
        });
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
          _id: updatedCart._id,
          items: updatedCart.items || [],
          itemCount: updatedCart.itemCount || 0,
          subtotal: updatedCart.totalPrice || 0,
        }));
        return { success: true };
      } catch (err) {
        console.error('Failed to add item to cart:', err);
        return { success: false, error: err.response?.data?.message || 'Failed to add item' };
      } finally {
        setLoading(false);
      }
    } else {
      // Guest cart - localStorage only, use backend field names
      const updatedItems = [...cart.items];
      const existingIndex = updatedItems.findIndex(
        item => item.food === foodItem._id && JSON.stringify(item.customization) === JSON.stringify(customization)
      );
      if (existingIndex > -1) {
        updatedItems[existingIndex].quantity += quantity;
        updatedItems[existingIndex].subtotal = updatedItems[existingIndex].price * updatedItems[existingIndex].quantity;
      } else {
        updatedItems.push({
          food: foodItem._id,
          foodName: foodItem.name,
          price: foodItem.price,
          quantity,
          subtotal: foodItem.price * quantity,
        });
      }
      const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.subtotal), 0);
      const newItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const updatedCart = {
        items: updatedItems,
        itemCount: newItemCount,
        subtotal: newSubtotal,
      };
      setCart(updatedCart);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
      return { success: true };
    }
  };

  // Update item quantity
  const updateItemQuantity = async (itemId, quantity) => {
    if (quantity < 1) {
      return removeItem(itemId);
    }
    if (isAuthenticated) {
      try {
        setLoading(true);
        const response = await api.patch(`/api/v1/cart/items/${itemId}`, { quantity });
        const updatedCart = response.data.data;
        setCart({
          _id: updatedCart._id,
          items: updatedCart.items || [],
          itemCount: updatedCart.itemCount || 0,
          subtotal: updatedCart.totalPrice || 0,
        });
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
          _id: updatedCart._id,
          items: updatedCart.items || [],
          itemCount: updatedCart.itemCount || 0,
          subtotal: updatedCart.totalPrice || 0,
        }));
        return { success: true };
      } catch (err) {
        console.error('Failed to update cart item:', err);
        return { success: false, error: err.response?.data?.message || 'Failed to update item' };
      } finally {
        setLoading(false);
      }
    } else {
      // Guest cart
      const updatedItems = cart.items.map(item =>
        item.food === itemId ? { ...item, quantity, subtotal: item.price * quantity } : item
      );
      const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.subtotal), 0);
      const newItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const updatedCart = {
        items: updatedItems,
        itemCount: newItemCount,
        subtotal: newSubtotal,
      };
      setCart(updatedCart);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
      return { success: true };
    }
  };

  // Remove item from cart
  const removeItem = async (itemId) => {
    if (isAuthenticated) {
      try {
        setLoading(true);
        const response = await api.delete(`/api/v1/cart/items/${itemId}`);
        const updatedCart = response.data.data;
        setCart({
          _id: updatedCart?._id,
          items: updatedCart?.items || [],
          itemCount: updatedCart?.itemCount || 0,
          subtotal: updatedCart?.totalPrice || 0,
        });
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
          _id: updatedCart?._id,
          items: updatedCart?.items || [],
          itemCount: updatedCart?.itemCount || 0,
          subtotal: updatedCart?.totalPrice || 0,
        }));
        return { success: true };
      } catch (err) {
        console.error('Failed to remove cart item:', err);
        return { success: false, error: err.response?.data?.message || 'Failed to remove item' };
      } finally {
        setLoading(false);
      }
    } else {
      // Guest cart
      const updatedItems = cart.items.filter(item => item.food !== itemId);
      const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.subtotal), 0);
      const newItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const updatedCart = {
        items: updatedItems,
        itemCount: newItemCount,
        subtotal: newSubtotal,
      };
      setCart(updatedCart);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
      return { success: true };
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        setLoading(true);
        await api.delete('/api/v1/cart');
        // Refetch cart to get new cart with _id
        await fetchCart();
        localStorage.removeItem(CART_STORAGE_KEY);
        return { success: true };
      } catch (err) {
        console.error('Failed to clear cart:', err);
        return { success: false, error: err.response?.data?.message || 'Failed to clear cart' };
      } finally {
        setLoading(false);
      }
    } else {
      // Guest cart
      setCart({ items: [], itemCount: 0, subtotal: 0 });
      localStorage.removeItem(CART_STORAGE_KEY);
      return { success: true };
    }
  };

  // Validate cart before checkout
  const validateCart = async () => {
    if (!isAuthenticated) {
      return { success: false, error: 'Please login to proceed with checkout' };
    }

    try {
      setLoading(true);
      const response = await api.post('/api/v1/cart/validate');
      return { success: true, data: response.data.data };
    } catch (err) {
      console.error('Cart validation failed:', err);
      return { 
        success: false, 
        error: err.response?.data?.message || 'Cart validation failed',
        details: err.response?.data?.data
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      addItem,
      updateItemQuantity,
      removeItem,
      clearCart,
      validateCart,
      fetchCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};
