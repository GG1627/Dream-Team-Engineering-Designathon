'use client';

import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

interface LoadingSpinnerProps {
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
  className?: string;
}

export default function LoadingSpinner({ 
  size = 24, 
  color = 'primary',
  className = '' 
}: LoadingSpinnerProps) {
  return (
    <Box 
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className={className}
    >
      <CircularProgress size={size} color={color} />
    </Box>
  );
}

// Full page loading spinner
export function FullPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <LoadingSpinner size={40} />
    </div>
  );
}

// Button loading spinner (smaller, inline)
export function ButtonLoadingSpinner() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', marginRight: 1 }}>
      <CircularProgress size={16} sx={{ color: 'white' }} />
    </Box>
  );
}

