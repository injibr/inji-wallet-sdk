import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface ShareVCSuccessScreenProps {
  protocolNumber: string;
  onDone: () => void;
}

export function ShareVCSuccessScreen({ protocolNumber, onDone }: ShareVCSuccessScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✅</Text>
        </View>

        <Text style={styles.title}>Share Successful!</Text>
        <Text style={styles.subtitle}>
          Your credentials have been securely shared with the verifier
        </Text>

        {protocolNumber && protocolNumber !== 'N/A' && (
          <View style={styles.protocolCard}>
            <Text style={styles.protocolLabel}>Protocol Number</Text>
            <Text style={styles.protocolNumber}>{protocolNumber}</Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>✅ What happens next?</Text>
          <Text style={styles.infoText}>
            • The verifier has received your credentials
          </Text>
          <Text style={styles.infoText}>
            • They will verify the authenticity of the information
          </Text>
          <Text style={styles.infoText}>
            • You should receive confirmation shortly
          </Text>
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={onDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAF8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  protocolCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    alignItems: 'center',
  },
  protocolLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  protocolNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#446443',
    fontFamily: 'monospace',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 32,
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
    marginBottom: 4,
  },
  doneButton: {
    backgroundColor: '#446443',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
