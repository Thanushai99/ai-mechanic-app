import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_STORAGE_KEY = 'ai-mechanic-scan-history';

export type ScanHistoryItem = {
  id: string;
  createdAt: string;
  analysisStatus: 'usable' | 'insufficient_image' | 'unsupported';
  severity: 'low' | 'medium' | 'high' | 'unknown';
  title: string;
  explanation: string;
  driveAdvice:
    | 'do_not_drive'
    | 'drive_to_service_only'
    | 'schedule_service'
    | 'monitor'
    | 'unknown';

  criticalSignal:
    | 'red_oil_pressure'
    | 'red_brake_warning'
    | 'overheating_warning'
    | 'flashing_check_engine'
    | 'none'
    | 'unknown';
        
  observedEvidence: string[];
  nextSteps: string[];
  limitations: string[];
};

export async function getScanHistory(): Promise<ScanHistoryItem[]> {
  const savedHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);

  if (!savedHistory) {
    return [];
  }

  return JSON.parse(savedHistory) as ScanHistoryItem[];
}

export async function saveScanHistoryItem(
  item: ScanHistoryItem
): Promise<void> {
  const existingHistory = await getScanHistory();

  const updatedHistory = [item, ...existingHistory].slice(0, 25);

  await AsyncStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(updatedHistory)
  );
}

export async function clearScanHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
}