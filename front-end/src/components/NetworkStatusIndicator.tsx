import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useNetwork } from '@/context/NetworkContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { t } from '@/i8n';

/**
 * Displays network status to the user
 * Shows when offline or on slow connection
 */
export function NetworkStatusIndicator() {
  const { isOnline, quality, saveData } = useNetwork();

  if (!isOnline) {
    return (
      <Alert className="rounded-none border-b bg-destructive/5 border-destructive/20">
        <WifiOff className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive font-medium">
          {t("network_status.offline")}
        </AlertDescription>
      </Alert>
    );
  }

  if (quality === 'slow') {
    return (
      <Alert className="rounded-none border-b bg-warning/5 border-warning/20">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning font-medium">
          {t("network_status.slow_network")}
        </AlertDescription>
      </Alert>
    );
  }

  if (saveData) {
    return (
      <Alert className="rounded-none border-b bg-secondary/10 border-secondary/20">
        <Wifi className="h-4 w-4 text-secondary" />
        <AlertDescription className="text-secondary font-medium">
          {t("network_status.save_data_mode")}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
