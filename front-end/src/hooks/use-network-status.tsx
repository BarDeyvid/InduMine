import { useEffect, useState } from 'react';

export type NetworkQuality = 'slow' | 'medium' | 'fast';

interface NetworkInfo {
  quality: NetworkQuality;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  isOnline: boolean;
}

/**
 * Hook to detect network quality and adjust app behavior
 * Helps optimize for poor network conditions
 */
export function useNetworkStatus(): NetworkInfo {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    quality: 'medium',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    isOnline: navigator.onLine,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      // Check if user prefers reduced data usage
      const saveData =
        (navigator as any).connection?.saveData ||
        (navigator as any).mozConnection?.saveData ||
        false;

      // Get connection info
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      if (connection) {
        const effectiveType = connection.effectiveType || '4g';
        const downlink = connection.downlink || 10;
        const rtt = connection.rtt || 50;

        // Determine quality based on connection type and metrics
        let quality: NetworkQuality = 'medium';
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          quality = 'slow';
        } else if (effectiveType === '3g' || rtt > 200 || downlink < 1) {
          quality = 'slow';
        } else if (effectiveType === 'lte' || rtt > 100 || downlink < 5) {
          quality = 'medium';
        } else {
          quality = 'fast';
        }

        setNetworkInfo({
          quality,
          effectiveType,
          downlink,
          rtt,
          saveData,
          isOnline: navigator.onLine,
        });
      }
    };

    // Update on online/offline changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Update on connection change
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    // Initial check
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return networkInfo;
}

/**
 * Custom hook to get recommended image quality based on network
 */
export function useAdaptiveImage(baseUrl: string): string {
  const { quality, saveData } = useNetworkStatus();

  if (!baseUrl) return baseUrl;

  // For slow networks or when user requests data saving, use smaller sizes
  if (quality === 'slow' || saveData) {
    return baseUrl.replace('/full/', '/thumb/').replace(/\.jpg$/, '-small.jpg');
  }

  if (quality === 'medium') {
    return baseUrl.replace('/full/', '/medium/').replace(/\.jpg$/, '-medium.jpg');
  }

  return baseUrl;
}
