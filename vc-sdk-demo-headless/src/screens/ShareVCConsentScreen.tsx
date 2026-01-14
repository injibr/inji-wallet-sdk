import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { VCSDK } from 'vc-sdk-headless';

interface ShareVCConsentScreenProps {
  shareUrl: string;
  onApprove: (authRequest: any, requestedCredentials: any[]) => void;
  onDecline: () => void;
  onBack: () => void;
}

export function ShareVCConsentScreen({
  shareUrl,
  onApprove,
  onDecline,
  onBack,
}: ShareVCConsentScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifierInfo, setVerifierInfo] = useState<any>(null);
  const [requestedCredentials, setRequestedCredentials] = useState<any[]>([]);
  const [authRequest, setAuthRequest] = useState<any>(null);

  useEffect(() => {
    parseShareRequest();
  }, [shareUrl]);

  const parseShareRequest = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[ShareVCConsent] Parsing share request...');
      const result = await VCSDK.share.parseRequest(shareUrl);

      console.log('[ShareVCConsent] Parse result:', {
        verifier: result.verifierInfo,
        credentialsCount: result.requestedCredentials.length,
      });

      setVerifierInfo(result.verifierInfo);
      setRequestedCredentials(result.requestedCredentials);
      setAuthRequest(result.authRequest);
      setLoading(false);
    } catch (err: any) {
      console.error('[ShareVCConsent] Parse error:', err);
      setError(err.message || 'Failed to parse share request');
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (authRequest && requestedCredentials) {
      onApprove(authRequest, requestedCredentials);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analyzing Request</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#446443" />
          <Text style={styles.loadingText}>Parsing share request...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Failed to Parse Request</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={onBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Authorization Request</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Verifier Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Verifier Information</Text>
          <View style={styles.verifierCard}>
            {verifierInfo?.logo && (
              <Image source={{ uri: verifierInfo.logo }} style={styles.verifierLogo} />
            )}
            <Text style={styles.verifierName}>
              {verifierInfo?.name || 'Unknown Verifier'}
            </Text>
            <Text style={styles.verifierUrl}>{verifierInfo?.url || 'N/A'}</Text>
          </View>
        </View>

        {/* Purpose */}
        {verifierInfo?.purpose && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Purpose</Text>
            <View style={styles.purposeCard}>
              <Text style={styles.purposeText}>{verifierInfo.purpose}</Text>
            </View>
          </View>
        )}

        {/* Requested Credentials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📄 Requested Credentials ({requestedCredentials.length})
          </Text>
          {requestedCredentials.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No specific credentials requested</Text>
            </View>
          ) : (
            requestedCredentials.map((cred, index) => (
              <View key={index} style={styles.credentialCard}>
                {cred.logoUrl && (
                  <Image source={{ uri: cred.logoUrl }} style={styles.credentialLogo} />
                )}
                <View style={styles.credentialInfo}>
                  <Text style={styles.credentialName}>{cred.name || cred.type}</Text>
                  <Text style={styles.credentialSystem}>From: {cred.system || 'Unknown'}</Text>
                  {cred.inputDescriptorId && (
                    <Text style={styles.credentialId}>ID: {cred.inputDescriptorId}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Warning Box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Before You Proceed</Text>
          <Text style={styles.warningText}>
            • Make sure you recognize the verifier
          </Text>
          <Text style={styles.warningText}>
            • Only share credentials with trusted parties
          </Text>
          <Text style={styles.warningText}>
            • The verifier will receive the requested information
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton} onPress={handleApprove}>
          <Text style={styles.approveButtonText}>Approve & Share</Text>
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
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 12,
  },
  verifierCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  verifierLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  verifierName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 4,
    textAlign: 'center',
  },
  verifierUrl: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  purposeCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#446443',
  },
  purposeText: {
    fontSize: 14,
    color: '#2D2D2D',
    lineHeight: 20,
  },
  credentialCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    alignItems: 'center',
  },
  credentialLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  credentialInfo: {
    flex: 1,
  },
  credentialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 2,
  },
  credentialSystem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  credentialId: {
    fontSize: 12,
    color: '#999',
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  spacer: {
    height: 100,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DC3545',
  },
  declineButtonText: {
    color: '#DC3545',
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#446443',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#446443',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
