import toast from 'react-hot-toast';

/**
 * Toast Notification Utility
 * Centralized toast management with consistent styling
 */

const toastConfig = {
  duration: 3000,
  position: 'top-center',
  style: {
    borderRadius: '8px',
    fontWeight: '500',
    fontSize: '14px',
  },
};

export const showSuccess = (message) => {
  return toast.success(message, {
    ...toastConfig,
    style: {
      ...toastConfig.style,
      background: '#10b981',
      color: '#fff',
    },
    icon: '✅',
  });
};

export const showError = (message) => {
  return toast.error(message, {
    ...toastConfig,
    duration: 4000,
    style: {
      ...toastConfig.style,
      background: '#ef4444',
      color: '#fff',
    },
    icon: '❌',
  });
};

export const showLoading = (message) => {
  return toast.loading(message, {
    ...toastConfig,
    style: {
      ...toastConfig.style,
      background: '#3b82f6',
      color: '#fff',
    },
  });
};

export const showInfo = (message) => {
  return toast(message, {
    ...toastConfig,
    style: {
      ...toastConfig.style,
      background: '#3b82f6',
      color: '#fff',
    },
    icon: 'ℹ️',
  });
};

export const dismissToast = (id) => {
  toast.dismiss(id);
};

export const dismissAll = () => {
  toast.dismiss();
};

export default {
  success: showSuccess,
  error: showError,
  loading: showLoading,
  info: showInfo,
  dismiss: dismissToast,
  dismissAll,
};
