import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

interface ShareVCErrorScreenProps {
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}

export function ShareVCErrorScreen({ error, onRetry, onCancel }: ShareVCErrorScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>❌</Text>
        </View>

        <Text style={styles.title}>Share Failed</Text>
        <Text style={styles.subtitle}>We couldn't complete the share request</Text>

        <View style={styles.errorCard}>
          <Text style={styles.errorLabel}>Error Details:</Text>
          <ScrollView style={styles.errorScroll}>
            <Text style={styles.errorText}>{error}</Text>
          </ScrollView>
        </View>

        <View style={styles.troubleshootBox}>
          <Text style={styles.troubleshootTitle}>💡 Troubleshooting Tips</Text>
          <Text style={styles.troubleshootText}>
            • Check your internet connection
          </Text>
          <Text style={styles.troubleshootText}>
            • Make sure you're authenticated
          </Text>
          <Text style={styles.troubleshootText}>
            • Verify the QR code is still valid
          </Text>
          <Text style={styles.troubleshootText}>
            • Try downloading credentials again
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
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
    backgroundColor: '#FFEBEE',
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
    color: '#DC3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DC3545',
    maxHeight: 150,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC3545',
    marginBottom: 8,
  },
  errorScroll: {
    maxHeight: 100,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  troubleshootBox: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  troubleshootTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  troubleshootText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#446443',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
