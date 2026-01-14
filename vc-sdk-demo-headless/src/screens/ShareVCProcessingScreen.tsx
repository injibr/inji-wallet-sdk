import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { VCSDK } from 'vc-sdk-headless';

interface ShareVCProcessingScreenProps {
  authRequest: any;
  requestedCredentials: any[];
  onSuccess: (protocolNumber: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export function ShareVCProcessingScreen({
  authRequest,
  requestedCredentials,
  onSuccess,
  onError,
  onBack,
}: ShareVCProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState('Downloading credentials...');
  const [progress, setProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<{
    total: number;
    success: number;
    error424: number;
    errors: number;
  }>({
    total: 0,
    success: 0,
    error424: 0,
    errors: 0,
  });
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    startShareFlow();

    // Listen to SDK events
    const handleDownloadStart = ({ total }: any) => {
      addLog(`📥 Starting download of ${total} credentials...`);
      setDownloadStatus((prev) => ({ ...prev, total }));
    };

    const handleDownloadProgress = ({ current, total, credentialName }: any) => {
      addLog(`⏳ Downloading ${credentialName} (${current}/${total})`);
      setProgress((current / total) * 50); // First 50% for download
    };

    const handleDownloadComplete = ({ successCount, error424Count, realErrorCount }: any) => {
      addLog(
        `✅ Download complete: ${successCount} success, ${error424Count} not available, ${realErrorCount} errors`
      );
      setDownloadStatus({
        total: requestedCredentials.length,
        success: successCount,
        error424: error424Count,
        errors: realErrorCount,
      });
    };

    const handle424 = ({ credentialTypeId, credentialName, issuerName }: any) => {
      addLog(`⚠️ ${credentialName} not available from ${issuerName}`);
    };

    const handleSharingStart = () => {
      addLog('🔄 Creating verifiable presentation...');
      setCurrentStep('Creating presentation...');
      setProgress(60);
    };

    const handleSharingProgress = ({ message }: any) => {
      addLog(`⏳ ${message}`);
      setProgress((prev) => Math.min(prev + 10, 90));
    };

    VCSDK.events.on('share:downloadStarted', handleDownloadStart);
    VCSDK.events.on('share:downloadProgress', handleDownloadProgress);
    VCSDK.events.on('share:downloadComplete', handleDownloadComplete);
    VCSDK.events.on('share:credentialNotAvailable424', handle424);
    VCSDK.events.on('share:sharingStarted', handleSharingStart);
    VCSDK.events.on('share:sharingProgress', handleSharingProgress);

    return () => {
      VCSDK.events.off('share:downloadStarted', handleDownloadStart);
      VCSDK.events.off('share:downloadProgress', handleDownloadProgress);
      VCSDK.events.off('share:downloadComplete', handleDownloadComplete);
      VCSDK.events.off('share:credentialNotAvailable424', handle424);
      VCSDK.events.off('share:sharingStarted', handleSharingStart);
      VCSDK.events.off('share:sharingProgress', handleSharingProgress);
    };
  }, []);

  const addLog = (message: string) => {
    console.log('[ShareVCProcessing]', message);
    setLogs((prev) => [...prev, message]);
  };

  const startShareFlow = async () => {
    try {
      // Step 1: Download credentials
      addLog('📥 Step 1: Downloading missing credentials...');
      setCurrentStep('Downloading credentials...');

      const downloadResult = await VCSDK.share.downloadCredentials(requestedCredentials);

      addLog(
        `✅ Downloaded ${downloadResult.successCount}/${requestedCredentials.length} credentials`
      );

      if (downloadResult.error424Count > 0) {
        addLog(`⚠️ ${downloadResult.error424Count} credentials not available (424)`);
      }

      if (downloadResult.realErrorCount > 0) {
        addLog(`❌ ${downloadResult.realErrorCount} credentials failed to download`);
      }

      // Log download status
      const totalRequested = requestedCredentials.length;
      if (downloadResult.successCount === 0) {
        addLog('⚠️ No credentials were successfully downloaded');
        addLog('ℹ️ Proceeding to complete transaction with empty credentials array...');
      } else if (downloadResult.successCount < totalRequested) {
        const missing = totalRequested - downloadResult.successCount;
        addLog(
          `⚠️ Partial download: ${downloadResult.successCount}/${totalRequested} credentials available. ${missing} missing.`
        );
        addLog('ℹ️ Proceeding to share available credentials only...');
      } else {
        addLog(`✅ All ${downloadResult.successCount} credentials ready to share`);
      }

      // Step 2: Complete share
      addLog('📤 Step 2: Creating and sending verifiable presentation...');
      setCurrentStep('Sending to verifier...');
      setProgress(70);

      const shareResult = await VCSDK.share.completeShare(authRequest, requestedCredentials);

      if (shareResult.success) {
        addLog('✅ Share completed successfully!');
        setProgress(100);
        setCurrentStep('Complete!');
        onSuccess(shareResult.protocolNumber || 'N/A');
      } else {
        throw new Error('Share failed');
      }
    } catch (err: any) {
      console.error('[ShareVCProcessing] Error:', err);
      addLog(`❌ Error: ${err.message}`);
      onError(err.message || 'Failed to complete share');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Processing Share Request</Text>
      </View>

      <View style={styles.content}>
        {/* Progress Section */}
        <View style={styles.progressSection}>
          <ActivityIndicator size="large" color="#446443" />
          <Text style={styles.currentStep}>{currentStep}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {/* Status Cards */}
        {downloadStatus.total > 0 && (
          <View style={styles.statusSection}>
            <View style={styles.statusCard}>
              <Text style={styles.statusNumber}>{downloadStatus.total}</Text>
              <Text style={styles.statusLabel}>Total</Text>
            </View>
            <View style={[styles.statusCard, styles.successCard]}>
              <Text style={styles.statusNumber}>{downloadStatus.success}</Text>
              <Text style={styles.statusLabel}>Downloaded</Text>
            </View>
            {downloadStatus.error424 > 0 && (
              <View style={[styles.statusCard, styles.warningCard]}>
                <Text style={styles.statusNumber}>{downloadStatus.error424}</Text>
                <Text style={styles.statusLabel}>N/A (424)</Text>
              </View>
            )}
            {downloadStatus.errors > 0 && (
              <View style={[styles.statusCard, styles.errorCard]}>
                <Text style={styles.statusNumber}>{downloadStatus.errors}</Text>
                <Text style={styles.statusLabel}>Errors</Text>
              </View>
            )}
          </View>
        )}

        {/* Logs */}
        <View style={styles.logsSection}>
          <Text style={styles.logsTitle}>Activity Log:</Text>
          <ScrollView style={styles.logsList}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logItem}>
                {log}
              </Text>
            ))}
          </ScrollView>
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
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#446443',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  currentStep: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E6E6E6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#446443',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  successCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFA500',
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderColor: '#DC3545',
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
  },
  logsSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  logsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  logsList: {
    flex: 1,
  },
  logItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
