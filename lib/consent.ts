import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_STORAGE_KEY = 'ai-mechanic-consent-accepted';

export async function hasAcceptedConsent(): Promise<boolean> {
  const savedConsent = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);

  return savedConsent === 'true';
}

export async function saveConsentAcceptance(): Promise<void> {
  await AsyncStorage.setItem(CONSENT_STORAGE_KEY, 'true');
}