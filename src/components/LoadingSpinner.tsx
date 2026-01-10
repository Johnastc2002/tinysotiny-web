import React from 'react';

interface LoadingSpinnerProps {
  size?: number | string;
  color?: string; // Color of the spinning part (border-top)
  trackColor?: string; // Color of the full ring (border)
  className?: string;
}

export default function LoadingSpinner({
  size = 24,
  color = '#ffffff',
  trackColor = 'rgba(255, 255, 255, 0.1)',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: `2px solid ${trackColor}`,
        borderTopColor: color,
      }}
    />
  );
}

