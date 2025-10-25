/**
 * Loading Spinner Component
 * Professional loading indicator with customizable size and color
 */

import React from 'react';
import PropTypes from 'prop-types';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'accent',
  fullScreen = false,
  message = '',
}) => {
  const sizeMap = {
    small: '24px',
    medium: '40px',
    large: '60px',
  };

  const colorMap = {
    accent: 'var(--color-accent)',
    primary: 'var(--color-text)',
    white: '#ffffff',
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;
  const spinnerColor = colorMap[color] || colorMap.accent;

  const spinner = (
    <div className="loading-spinner-container">
      <div
        className="loading-spinner"
        style={{
          width: spinnerSize,
          height: spinnerSize,
          borderColor: `${spinnerColor}30`,
          borderTopColor: spinnerColor,
        }}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="loading-message" style={{ color: spinnerColor }}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-fullscreen" aria-live="polite">
        {spinner}
      </div>
    );
  }

  return spinner;
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.oneOf(['accent', 'primary', 'white']),
  fullScreen: PropTypes.bool,
  message: PropTypes.string,
};

export default LoadingSpinner;
