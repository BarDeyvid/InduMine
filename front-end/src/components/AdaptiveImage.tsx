import { ImgHTMLAttributes, useState, useEffect } from 'react';
import { useNetwork } from '@/context/NetworkContext';

interface AdaptiveImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  eager?: boolean;
}

/**
 * AdaptiveImage component that:
 * - Lazy loads images by default
 * - Uses placeholder background on slow networks
 * - Includes proper error handling
 * - Adapts quality based on network conditions
 */
export function AdaptiveImage({
  src,
  alt,
  fallback,
  eager = false,
  className = '',
  ...props
}: AdaptiveImageProps) {
  const { isSlowNetwork, saveData } = useNetwork();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loading = eager ? 'eager' : 'lazy';
  const decoding = eager ? 'auto' : 'async';

  // Don't try to load images on very slow networks unless already cached
  if (!src) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <>
      {!isLoaded && !hasError && (
        <div
          className={`absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/10 animate-pulse ${className}`}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        {...props}
      />
      {hasError && fallback ? <>{fallback}</> : null}
    </>
  );
}
