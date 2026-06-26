import { StatusBar } from 'expo-status-bar';
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

type Screen = 'home' | 'preview' | 'analyzing' | 'result';

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Please allow camera access so you can photograph your dashboard warning lights.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      exif: false,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setScreen('preview');
    }
  };

  const openPhotoLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo library permission needed',
        'Please allow photo-library access so you can choose a dashboard photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      exif: false,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setScreen('preview');
    }
  };

  const analyzePhoto = () => {
    setScreen('analyzing');

    setTimeout(() => {
      setScreen('result');
    }, 1600);
  };

  const startOver = () => {
    setSelectedImage(null);
    setScreen('home');
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
            Checking visible warning indicators and preparing recommended next
            steps.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'result') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <ScrollView contentContainerStyle={styles.resultScreen}>
          <View style={styles.highSeverityBadge}>
            <Text style={styles.highSeverityBadgeText}>HIGH PRIORITY</Text>
          </View>

          <Text style={styles.resultTitle}>Potential oil-pressure warning</Text>

          <Text style={styles.resultIntro}>
            A red oil-pressure alert appears to be visible on the dashboard.
            This can indicate that the engine may not be receiving enough oil
            pressure.
          </Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardLabel}>WHAT WAS OBSERVED</Text>

            <Text style={styles.resultCardText}>
              • Red oil-can warning symbol visible{'\n'}
              • “Oil Pressure” message displayed{'\n'}
              • Additional warning indicators may also be present
            </Text>
          </View>

          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>⚠️</Text>

            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Recommended action</Text>

              <Text style={styles.actionDescription}>
                Stop driving as soon as it is safe to do so. Shut off the
                engine and arrange professional inspection or towing.
              </Text>
            </View>
          </View>

          <Text style={styles.stepsTitle}>Next steps</Text>

          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Pull over safely and turn off the engine.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>
              Check the owner’s manual for the specific warning symbol.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Contact roadside assistance or a qualified mechanic.
            </Text>
          </View>

          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>Important</Text>

            <Text style={styles.disclaimerText}>
              This assessment is based on visible dashboard information only.
              A photo cannot confirm the exact cause of a vehicle issue.
            </Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={startOver}>
            <Text style={styles.primaryButtonText}>Scan Another Photo</Text>
          </Pressable>
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
  highSeverityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7F1D1D',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 18,
  },
  highSeverityBadgeText: {
    color: '#FECACA',
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
    backgroundColor: '#3A2023',
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
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
});