import React, { createContext, useContext } from 'react';
import { useNetworkStatus, type NetworkQuality } from '@/hooks/use-network-status';

interface NetworkContextType {
  isOnline: boolean;
  quality: NetworkQuality;
  saveData: boolean;
  isSlowNetwork: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const networkInfo = useNetworkStatus();

  const value: NetworkContextType = {
    isOnline: networkInfo.isOnline,
    quality: networkInfo.quality,
    saveData: networkInfo.saveData,
    isSlowNetwork: networkInfo.quality === 'slow' || !networkInfo.isOnline,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}
