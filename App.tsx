import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from './lib/supabase';
import {
  clearScanHistory,
  getScanHistory,
  saveScanHistoryItem,
  type ScanHistoryItem,
} from './lib/history';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

type Screen = 'home' | 'preview' | 'analyzing' | 'result' | 'history';

type DashboardAnalysis = {
  analysisStatus: 'usable' | 'insufficient_image' | 'unsupported';
  severity: 'low' | 'medium' | 'high' | 'unknown';
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
  title: string;
  explanation: string;
  observedEvidence: string[];
  nextSteps: string[];
  limitations: string[];
};

type AnalysisErrorCopy = {
  title: string;
  message: string;
};

async function getAnalysisErrorCopy(
  error: unknown
): Promise<AnalysisErrorCopy> {
  const fallback = {
    title: 'Analysis unavailable',
    message:
      'We could not analyze this dashboard photo right now. Please try again shortly.',
  };

  if (error instanceof FunctionsFetchError) {
    return {
      title: 'Connection problem',
      message:
        'Your dashboard photo could not reach the analysis service. Check your internet connection and try again.',
    };
  }

  if (error instanceof FunctionsRelayError) {
    return {
      title: 'Service unavailable',
      message:
        'The analysis service could not be reached right now. Please try again shortly.',
    };
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const responseBody = await error.context.json();

      const message =
        responseBody &&
          typeof responseBody === 'object' &&
          'error' in responseBody &&
          responseBody.error &&
          typeof responseBody.error === 'object' &&
          'message' in responseBody.error &&
          typeof responseBody.error.message === 'string'
          ? responseBody.error.message.toLowerCase()
          : '';

      if (message.includes('too large')) {
        return {
          title: 'Photo too large',
          message:
            'Please choose a smaller dashboard photo or retake it from closer up.',
        };
      }

      if (
        message.includes('quota') ||
        message.includes('limit') ||
        message.includes('temporarily unavailable')
      ) {
        return {
          title: 'Analysis temporarily unavailable',
          message:
            'The AI analysis service is temporarily unavailable. Please try again later.',
        };
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState('image/jpeg');
  const [screen, setScreen] = useState<Screen>('home');
  const [analysis, setAnalysis] = useState<DashboardAnalysis | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  const selectImage = (asset: ImagePicker.ImagePickerAsset) => {
    setSelectedImage(asset.uri);
    setSelectedMimeType(asset.mimeType ?? 'image/jpeg');
    setAnalysis(null);
    setScreen('preview');
  };

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Please allow camera access so you can photograph dashboard warning lights.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      selectImage(result.assets[0]);
    }
  };

  const openPhotoLibrary = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo library permission needed',
        'Please allow photo-library access so you can choose a dashboard photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      selectImage(result.assets[0]);
    }
  };

  const ensureAnonymousSession = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error('Could not verify the app session.');
    }

    if (session) {
      return;
    }

    const { error } = await supabase.auth.signInAnonymously();

    if (error) {
      throw new Error('Could not start a secure app session.');
    }
  };

  const analyzePhoto = async () => {
    if (!selectedImage) {
      return;
    }

    setScreen('analyzing');

    try {
      await ensureAnonymousSession();

      const imageBase64 = await FileSystem.readAsStringAsync(selectedImage, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!imageBase64) {
        throw new Error('Could not read the selected image.');
      }

      const { data, error } = await supabase.functions.invoke(
        'analyze-dashboard',
        {
          body: {
            imageBase64,
            mimeType: selectedMimeType,
          },
        }
      );

      if (error) {
        console.error('Analysis function error:', error);
        throw error;
      }

      const returnedAnalysis = data?.analysis as DashboardAnalysis | undefined;

      if (!returnedAnalysis) {
        throw new Error('No usable analysis was returned for this photo.');
      }

      try {
        if (returnedAnalysis.analysisStatus === 'usable') {
          await saveScanHistoryItem({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
            analysisStatus: returnedAnalysis.analysisStatus,
            severity: returnedAnalysis.severity,
            title: returnedAnalysis.title,
            explanation: returnedAnalysis.explanation,
            driveAdvice: returnedAnalysis.driveAdvice,
            criticalSignal: returnedAnalysis.criticalSignal,
            observedEvidence: returnedAnalysis.observedEvidence,
            nextSteps: returnedAnalysis.nextSteps,
            limitations: returnedAnalysis.limitations,
          });
        }
      } catch (historyError) {
        console.warn('Could not save scan history:', historyError);
      }

      setAnalysis(returnedAnalysis);
      setScreen('result');
    } catch (error) {
      console.error('Dashboard analysis error:', error);

      const errorCopy = await getAnalysisErrorCopy(error);

      setScreen('preview');

      Alert.alert(errorCopy.title, errorCopy.message);
    }
  };

  const startOver = () => {
    setSelectedImage(null);
    setSelectedMimeType('image/jpeg');
    setAnalysis(null);
    setScreen('home');
  };

  async function openHistory() {
    try {
      const savedHistory = await getScanHistory();

      setScanHistory(savedHistory);
      setScreen('history');
    } catch (historyError) {
      console.warn('Could not load scan history:', historyError);

      Alert.alert(
        'History unavailable',
        'Your previous scans could not be loaded right now.'
      );
    }
  }

  async function clearHistory() {
    try {
      await clearScanHistory();
      setScanHistory([]);
    } catch (historyError) {
      console.warn('Could not clear scan history:', historyError);

      Alert.alert(
        'Could not clear history',
        'Your saved scans could not be deleted right now.'
      );
    }
  }

  function confirmClearHistory() {
    Alert.alert(
      'Clear scan history?',
      'This will permanently delete all saved dashboard checks from this iPhone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear history',
          style: 'destructive',
          onPress: () => {
            void clearHistory();
          },
        },
      ]
    );
  }

  function openHistoryItem(item: ScanHistoryItem) {
    setAnalysis({
      analysisStatus: item.analysisStatus,
      severity: item.severity,
      driveAdvice: item.driveAdvice,
      criticalSignal: item.criticalSignal ?? 'unknown',
      title: item.title,
      explanation: item.explanation,
      observedEvidence: item.observedEvidence,
      nextSteps: item.nextSteps,
      limitations: item.limitations,
    });

    setScreen('result');
  }

  const actionText = (driveAdvice: DashboardAnalysis['driveAdvice']) => {
    switch (driveAdvice) {
      case 'do_not_drive':
        return 'Stop driving as soon as it is safe to do so. Shut off the engine and arrange professional inspection or towing.';

      case 'drive_to_service_only':
        return 'Avoid unnecessary driving. Arrange an inspection promptly and only drive directly to a nearby service location if the vehicle is operating normally.';

      case 'schedule_service':
        return 'Arrange a service appointment soon and monitor for any changes in warning lights or vehicle behavior.';

      case 'monitor':
        return 'Monitor the warning and check the owner’s manual. Arrange service if it returns, changes, or is accompanied by unusual symptoms.';

      default:
        return 'Review the owner’s manual and seek professional guidance if you are unsure about the warning indicator.';
    }
  };

  const severityLabel = (severity: DashboardAnalysis['severity']) => {
    switch (severity) {
      case 'high':
        return 'HIGH PRIORITY';
      case 'medium':
        return 'SERVICE SOON';
      case 'low':
        return 'MONITOR';
      default:
        return 'ASSESSMENT LIMITED';
    }
  };

  const getResultPresentation = (result: DashboardAnalysis) => {
    if (result.analysisStatus === 'unsupported') {
      return {
        badge: 'UNSUPPORTED PHOTO',
        title: 'Dashboard not detected',
        description:
          'This photo does not appear to show a vehicle dashboard. No warning lights can be identified from this image.',
        action:
          'Choose a clear photo of your vehicle dashboard, focused on any illuminated warning indicators.',
        steps: [
          'Take or select a photo of the full dashboard.',
          'Make sure warning lights are visible and not blocked by glare.',
        ],
      };
    }

    if (result.analysisStatus === 'insufficient_image') {
      return {
        badge: 'PHOTO NEEDS RETAKING',
        title: 'Dashboard warning lights could not be read',
        description:
          'The dashboard photo was not clear enough to reliably identify warning indicators.',
        action:
          'Retake the photo in better lighting and make sure the warning lights are sharp and fully visible.',
        steps: [
          'Hold the phone steady and avoid glare.',
          'Include the full dashboard warning-light area.',
          'Try again with a brighter, clearer photo.',
        ],
      };
    }

    return {
      badge: severityLabel(result.severity),
      title: result.title,
      description: result.explanation,
      action: actionText(result.driveAdvice),
      steps: result.nextSteps,
    };
  };

  if (screen === 'analyzing') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.analyzingScreen}>
          <View style={styles.analyzingIcon}>
            <Text style={styles.analyzingIconText}>⌁</Text>
          </View>

          <ActivityIndicator size="large" color="#3B82F6" />

          <Text style={styles.analyzingTitle}>Reviewing dashboard photo</Text>

          <Text style={styles.analyzingDescription}>
            Checking visible warning indicators and preparing cautious next
            steps.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'result' && analysis) {
    const isHigh = analysis.severity === 'high';
    const presentation = getResultPresentation(analysis);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <ScrollView contentContainerStyle={styles.resultScreen}>
          <View style={styles.resultTopBar}>
            <Pressable style={styles.homeButton} onPress={startOver}>
              <Text style={styles.homeButtonText}>Home</Text>
            </Pressable>
          </View>
          <View
            style={[
              styles.severityBadge,
              isHigh ? styles.highBadge : styles.standardBadge,
            ]}
          >
            <Text style={styles.severityBadgeText}>{presentation.badge}</Text>
          </View>

          <Text style={styles.resultTitle}>{presentation.title}</Text>

          <Text style={styles.resultIntro}>{presentation.description}</Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardLabel}>WHAT WAS OBSERVED</Text>

            {analysis.observedEvidence.length > 0 ? (
              analysis.observedEvidence.map((item, index) => (
                <Text key={`${item}-${index}`} style={styles.resultCardText}>
                  • {item}
                </Text>
              ))
            ) : (
              <Text style={styles.resultCardText}>
                • No reliable visual evidence could be confirmed.
              </Text>
            )}
          </View>

          <View
            style={[
              styles.actionCard,
              isHigh ? styles.highActionCard : styles.standardActionCard,
            ]}
          >
            <Text style={styles.actionIcon}>⚠️</Text>

            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Recommended action</Text>

              <Text style={styles.actionDescription}>
                {presentation.action}
              </Text>
            </View>
          </View>

          <Text style={styles.stepsTitle}>Next steps</Text>

          {presentation.steps.map((step, index) => (
            <View key={`${step}-${index}`} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>Important</Text>

            <Text style={styles.disclaimerText}>
              {analysis.limitations.join(' ')}
            </Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={startOver}>
            <Text style={styles.primaryButtonText}>Scan Another Photo</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'history') {
    return (
      <SafeAreaView style={styles.historyScreen}>
        <StatusBar style="light" />

        <ScrollView contentContainerStyle={styles.historyContent}>
          <View style={styles.historyHeader}>
            <View style={styles.historyHeaderText}>
              <Text style={styles.historyEyebrow}>YOUR DEVICE</Text>
              <Text style={styles.historyTitle}>Scan history</Text>
              <Text style={styles.historySubtitle}>
                Previous dashboard checks saved on this iPhone.
              </Text>
            </View>

            <View style={styles.historyActions}>
              <Pressable
                style={styles.historyCloseButton}
                onPress={() => setScreen('home')}
              >
                <Text style={styles.historyCloseButtonText}>Close</Text>
              </Pressable>

              {scanHistory.length > 0 && (
                <Pressable
                  style={styles.clearHistoryButton}
                  onPress={confirmClearHistory}
                >
                  <Text style={styles.clearHistoryButtonText}>Clear all</Text>
                </Pressable>
              )}
            </View>
          </View>

          {scanHistory.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <Text style={styles.emptyHistoryTitle}>No scans yet</Text>
              <Text style={styles.emptyHistoryText}>
                Dashboard checks you complete will appear here.
              </Text>
            </View>
          ) : (
            scanHistory.map((item) => (
              <Pressable
                key={item.id}
                style={styles.historyCard}
                onPress={() => openHistoryItem(item)}
              >
                <View style={styles.historyCardTopRow}>
                  <Text style={styles.historyCardTitle}>{item.title}</Text>

                  <Text
                    style={[
                      styles.historySeverity,
                      item.severity === 'high' && styles.historySeverityHigh,
                      item.severity === 'medium' && styles.historySeverityMedium,
                      item.severity === 'low' && styles.historySeverityLow,
                    ]}
                  >
                    {item.severity.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.historyDate}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>

                <Text style={styles.historyExplanation}>
                  {item.explanation}
                </Text>

                <Text style={styles.historyAdvice}>
                  Recommended: {item.driveAdvice.replaceAll('_', ' ')}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'preview' && selectedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.previewScreen}>
          <Text style={styles.previewTitle}>Review your photo</Text>

          <Text style={styles.previewSubtitle}>
            Make sure the warning lights are visible, sharp, and not blocked by
            glare.
          </Text>

          <Image source={{ uri: selectedImage }} style={styles.previewImage} />

          <Pressable style={styles.primaryButton} onPress={analyzePhoto}>
            <Text style={styles.primaryButtonText}>Analyze Dashboard Photo</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={startOver}>
            <Text style={styles.secondaryButtonText}>
              Retake or Choose Another Photo
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI VEHICLE TRIAGE</Text>
        </View>

        <Text style={styles.title}>
          Know what your{'\n'}dashboard is telling{'\n'}you.
        </Text>

        <Text style={styles.subtitle}>
          Take a clear photo of your dashboard warning lights and get a simple,
          cautious explanation of what to do next.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>⚠️</Text>

          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Built for guidance, not diagnosis</Text>

            <Text style={styles.infoDescription}>
              For urgent warnings, smoke, overheating, brake issues, or unusual
              sounds, stop safely and contact a professional.
            </Text>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={openCamera}>
          <Text style={styles.primaryButtonText}>
            Scan Dashboard Warning Light
          </Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={openPhotoLibrary}>
          <Text style={styles.secondaryButtonText}>
            Choose Photo from Library
          </Text>
        </Pressable>

        <Pressable style={styles.historyShortcut} onPress={openHistory}>
          <Text style={styles.historyShortcutText}>View scan history</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        Version 1 · Dashboard warning-light scanner
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101827',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 20,
  },
  badgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 43,
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#182235',
    borderRadius: 18,
    padding: 18,
    marginBottom: 28,
  },
  infoIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoDescription: {
    color: '#AAB7C8',
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderColor: '#475569',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 17,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 24,
  },
  previewScreen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 42,
  },
  previewTitle: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
  },
  previewSubtitle: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: 390,
    borderRadius: 20,
    backgroundColor: '#182235',
    marginBottom: 24,
  },
  analyzingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  analyzingIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#182235',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  analyzingIconText: {
    color: '#60A5FA',
    fontSize: 44,
    fontWeight: '700',
  },
  analyzingTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 22,
    marginBottom: 10,
  },
  analyzingDescription: {
    color: '#AAB7C8',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  resultScreen: {
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 34,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 18,
  },
  highBadge: {
    backgroundColor: '#7F1D1D',
  },
  standardBadge: {
    backgroundColor: '#1E3A5F',
  },
  severityBadgeText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  resultTitle: {
    color: '#F8FAFC',
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 14,
  },
  resultIntro: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 22,
  },
  resultCard: {
    backgroundColor: '#182235',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  resultCardLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  resultCardText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 24,
  },
  actionCard: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
  },
  highActionCard: {
    backgroundColor: '#3A2023',
  },
  standardActionCard: {
    backgroundColor: '#182A44',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    color: '#FDE2E2',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  actionDescription: {
    color: '#F7CACA',
    fontSize: 14,
    lineHeight: 21,
  },
  stepsTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E3A5F',
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
  },
  disclaimerCard: {
    backgroundColor: '#182235',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  disclaimerTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  disclaimerText: {
    color: '#AAB7C8',
    fontSize: 13,
    lineHeight: 19,
  },
  historyShortcut: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  historyShortcutText: {
    color: '#93C5FD',
    fontSize: 15,
    fontWeight: '600',
  },
  historyScreen: {
    flex: 1,
    backgroundColor: '#101827',
  },

  historyContent: {
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },

  historyHeaderText: {
    flex: 1,
  },

  historyEyebrow: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },

  historyTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },

  historySubtitle: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },

  historyCloseButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  historyCloseButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },

  emptyHistoryCard: {
    backgroundColor: '#182235',
    borderWidth: 1,
    borderColor: '#26334D',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },

  emptyHistoryTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  emptyHistoryText: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },

  historyCard: {
    backgroundColor: '#182235',
    borderWidth: 1,
    borderColor: '#26334D',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },

  historyCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  historyCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },

  historySeverity: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },

  historySeverityHigh: {
    color: '#F87171',
  },

  historySeverityMedium: {
    color: '#FBBF24',
  },

  historySeverityLow: {
    color: '#86EFAC',
  },

  historyDate: {
    color: '#94A3B8',
    fontSize: 13,
  },

  historyExplanation: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
  },

  historyAdvice: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '600',
  },
  resultTopBar: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },

  homeButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  homeButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  historyActions: {
    alignItems: 'flex-end',
    gap: 8,
  },

  clearHistoryButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  clearHistoryButtonText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '700',
  },
});