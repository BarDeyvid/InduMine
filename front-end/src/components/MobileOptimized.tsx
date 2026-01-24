import React from 'react';
import { useNetwork } from '@/context/NetworkContext';

/**
 * Wrapper component for mobile-optimized content
 * Adjusts rendering based on network quality
 */
export function MobileOptimized({ children }: { children: React.ReactNode }) {
  const { isSlowNetwork } = useNetwork();

  return (
    <div className={isSlowNetwork ? 'reduce-motion' : ''}>
      {children}
    </div>
  );
}

/**
 * Component to conditionally render based on network speed
 * Useful for hiding heavy components on slow networks
 */
interface ConditionalRenderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minNetworkQuality?: 'slow' | 'medium' | 'fast';
}

export function NetworkAware({
  children,
  fallback = null,
  minNetworkQuality = 'slow'
}: ConditionalRenderProps) {
  const { quality } = useNetwork();

  const qualityMap = { slow: 0, medium: 1, fast: 2 };
  const minQuality = qualityMap[minNetworkQuality];
  const currentQuality = qualityMap[quality];

  if (currentQuality >= minQuality) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Grid component that adapts columns based on screen size
 * Mobile: 1 column, Tablet: 2 columns, Desktop: 3+ columns
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'gap-4'
}: ResponsiveGridProps) {
  const baseClasses = `grid ${gap}`;
  const gridCols = `
    grid-cols-${cols.mobile}
    sm:grid-cols-${cols.tablet}
    lg:grid-cols-${cols.desktop}
  `.replace(/\s+/g, ' ');

  return <div className={`${baseClasses} ${gridCols}`}>{children}</div>;
}

/**
 * Container that hides content on mobile unless explicitly shown
 */
export function DesktopOnly({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`hidden md:block ${className}`}>{children}</div>;
}

/**
 * Container that only shows on mobile devices
 */
export function MobileOnly({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`md:hidden ${className}`}>{children}</div>;
}
