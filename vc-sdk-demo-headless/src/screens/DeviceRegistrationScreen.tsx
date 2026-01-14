import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { VCSDK } from 'vc-sdk-headless';

interface DeviceRegistrationScreenProps {
  onBack: () => void;
}

export function DeviceRegistrationScreen({ onBack }: DeviceRegistrationScreenProps) {
  const [cpf, setCpf] = useState('');
  const [fcmToken, setFcmToken] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCPF = (text: string) => {
    // Remove non-digits
    const cleaned = text.replace(/\D/g, '');

    // Format as XXX.XXX.XXX-XX
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9)
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(
      9,
      11
    )}`;
  };

  const handleCPFChange = (text: string) => {
    const formatted = formatCPF(text);
    setCpf(formatted);
  };

  const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.length === 11;
  };

  const handleRegister = async () => {
    // Validate inputs
    if (!cpf) {
      Alert.alert('Validation Error', 'Please enter your CPF');
      return;
    }

    if (!validateCPF(cpf)) {
      Alert.alert('Validation Error', 'Please enter a valid CPF (11 digits)');
      return;
    }

    if (!fcmToken) {
      Alert.alert('Validation Error', 'Please enter the FCM token');
      return;
    }

    try {
      setLoading(true);

      // Remove formatting from CPF
      const cleanedCPF = cpf.replace(/\D/g, '');

      console.log('[DeviceRegistration] Registering device:', { cpf: cleanedCPF });

      // Register device using SDK
      await VCSDK.device.register(cleanedCPF, fcmToken);

      Alert.alert(
        'Registration Successful',
        'Your device has been registered for push notifications!',
        [
          {
            text: 'OK',
            onPress: () => {
              setCpf('');
              setFcmToken('');
              onBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[DeviceRegistration] Error:', error);
      Alert.alert('Registration Failed', error.message || 'Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Registration</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📱 Why Register Your Device?</Text>
          <Text style={styles.infoText}>
            Register your CPF with this device's FCM token to receive push notifications when
            your credentials are ready to download.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>CPF:</Text>
          <TextInput
            style={styles.input}
            value={cpf}
            onChangeText={handleCPFChange}
            placeholder="000.000.000-00"
            keyboardType="numeric"
            maxLength={14}
          />

          <Text style={styles.label}>FCM Token:</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={fcmToken}
            onChangeText={setFcmToken}
            placeholder="Paste your Firebase Cloud Messaging token here..."
            multiline
            numberOfLines={4}
          />

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>💡 How to get FCM Token:</Text>
            <Text style={styles.helpText}>
              1. Implement Firebase Cloud Messaging in your app
            </Text>
            <Text style={styles.helpText}>
              2. Request permissions for notifications
            </Text>
            <Text style={styles.helpText}>3. Get the token from Firebase</Text>
            <Text style={styles.helpText}>
              4. Paste it here to register this device
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Register Device</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#446443',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2D2D2D',
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    marginBottom: 20,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helpBox: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 4,
  },
  registerButton: {
    backgroundColor: '#446443',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
