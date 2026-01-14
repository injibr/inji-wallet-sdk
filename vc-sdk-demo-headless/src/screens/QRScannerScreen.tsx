import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';

interface QRScannerScreenProps {
  onScan: (url: string) => void;
  onClose: () => void;
}

export function QRScannerScreen({ onScan, onClose }: QRScannerScreenProps) {
  const [manualUrl, setManualUrl] = useState('openid4vp://authorize?client_id=https%3A%2F%2Finjiverify.credenciaisverificaveis-dev.dataprev.gov.br&response_type=vp_token&response_mode=direct_post&nonce=MTc1NzQxNDE3Mjk0MA%3D%3D&state=req_e8b73f84-4b64-4e00-bc47-51b1a7bf5415&response_uri=https%3A%2F%2Finjiverify.credenciaisverificaveis-hml.dataprev.gov.br%2Fv1%2Fverify%2Fvp-submission%2Fvp-process&presentation_definition=%7B%22id%22%3A%22c4822b58-7fb4-454e-b827-f8758fe27f9a%22%2C%22purpose%22%3A%22Relying+party+is+requesting+your+digital+ID+for+the+purpose+of+Self-Authentication%22%2C%22format%22%3A%7B%22ldp_vc%22%3A%7B%22proof_type%22%3A%5B%22Ed25519Signature2020%22%5D%7D%7D%2C%22input_descriptors%22%3A%5B%7B%22id%22%3A%22testid%22%2C%22format%22%3A%7B%22ldp_vc%22%3A%7B%22proof_type%22%3A%5B%22Ed25519Signature2020%22%5D%7D%7D%2C%22constraints%22%3A%7B%22fields%22%3A%5B%7B%22path%22%3A%5B%22%24.type%22%5D%2C%22filter%22%3A%7B%22type%22%3A%22object%22%2C%22pattern%22%3A%22CCIRCredential%22%7D%7D%5D%7D%7D%2C%7B%22id%22%3A%22testid%22%2C%22format%22%3A%7B%22ldp_vc%22%3A%7B%22proof_type%22%3A%5B%22Ed25519Signature2020%22%5D%7D%7D%2C%22constraints%22%3A%7B%22fields%22%3A%5B%7B%22path%22%3A%5B%22%24.type%22%5D%2C%22filter%22%3A%7B%22type%22%3A%22object%22%2C%22pattern%22%3A%22CARReceipt%22%7D%7D%5D%7D%7D%2C%7B%22id%22%3A%22testid%22%2C%22format%22%3A%7B%22ldp_vc%22%3A%7B%22proof_type%22%3A%5B%22Ed25519Signature2020%22%5D%7D%7D%2C%22constraints%22%3A%7B%22fields%22%3A%5B%7B%22path%22%3A%5B%22%24.type%22%5D%2C%22filter%22%3A%7B%22type%22%3A%22object%22%2C%22pattern%22%3A%22CAFCredential%22%7D%7D%5D%7D%7D%2C%7B%22id%22%3A%22testid%22%2C%22format%22%3A%7B%22ldp_vc%22%3A%7B%22proof_type%22%3A%5B%22Ed25519Signature2020%22%5D%7D%7D%2C%22constraints%22%3A%7B%22fields%22%3A%5B%7B%22path%22%3A%5B%22%24.type%22%5D%2C%22filter%22%3A%7B%22type%22%3A%22object%22%2C%22pattern%22%3A%22CARDocument%22%7D%7D%5D%7D%7D%5D%7D&client_metadata=%7B%22client_name%22%3A%22https%3A%2F%2Finjiverify.credenciaisverificaveis-hml.dataprev.gov.br%22%2C%22vp_formats%22%3A%7B%22ldp_vp%22%3A%7B%22proof_type%22%3A%22%5B%5C%22Ed25519Signature2018%5C%22%2C%5C%22Ed25519Signature2020%5C%22%2C%5C%22RsaSignature2018%5C%22%5D%22%7D%7D%7D');

  const handleManualSubmit = () => {
    if (!manualUrl.trim()) {
      Alert.alert('Error', 'Please enter a ShareVC URL');
      return;
    }
    console.log('[QRScanner] Manual URL entered:', manualUrl);
    onScan(manualUrl.trim());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Enter ShareVC URL</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 How to get ShareVC URL</Text>
          <Text style={styles.infoText}>
            1. The verifier will provide you with a ShareVC URL or QR code
          </Text>
          <Text style={styles.infoText}>
            2. The URL typically starts with "openid4vp://" or "https://"
          </Text>
          <Text style={styles.infoText}>
            3. Paste the complete URL below to continue
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>ShareVC URL:</Text>
          <TextInput
            style={styles.input}
            value={manualUrl}
            onChangeText={setManualUrl}
            placeholder="openid4vp://authorize?..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.submitButton, !manualUrl.trim() && styles.submitButtonDisabled]}
            onPress={handleManualSubmit}
            disabled={!manualUrl.trim()}
          >
            <Text style={styles.submitButtonText}>Continue to Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Note:</Text>
          <Text style={styles.noteText}>
            In a production app, you would typically scan a QR code provided by the verifier.
            For this demo, we use manual URL entry for simplicity.
          </Text>
        </View>
      </ScrollView>
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
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
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
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#2D2D2D',
    lineHeight: 20,
    marginBottom: 6,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    color: '#2D2D2D',
    padding: 16,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 140,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E6E6E6',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  submitButton: {
    backgroundColor: '#446443',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteBox: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
});
