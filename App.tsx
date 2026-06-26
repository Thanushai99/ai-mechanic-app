import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
    }
  };

  const analyzePhoto = () => {
    Alert.alert(
      'Photo ready',
      'Next, we will connect this screen to a mock AI analysis result before adding the real AI API.'
    );
  };

  const clearPhoto = () => {
    setSelectedImage(null);
  };

  if (selectedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.previewScreen}>
          <Text style={styles.previewTitle}>Review your photo</Text>

          <Text style={styles.previewSubtitle}>
            Make sure the warning lights are visible, sharp, and not blocked by glare.
          </Text>

          <Image source={{ uri: selectedImage }} style={styles.previewImage} />

          <Pressable style={styles.primaryButton} onPress={analyzePhoto}>
            <Text style={styles.primaryButtonText}>Analyze Dashboard Photo</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={clearPhoto}>
            <Text style={styles.secondaryButtonText}>Retake or Choose Another Photo</Text>
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
          <Text style={styles.primaryButtonText}>Scan Dashboard Warning Light</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={openPhotoLibrary}>
          <Text style={styles.secondaryButtonText}>Choose Photo from Library</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>Version 1 · Dashboard warning-light scanner</Text>
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
});