"use strict";

/**
 * NotificationService - Handles device mapping for push notifications
 *
 * This service registers the device with the notification server by mapping
 * the user's CPF number to their device FCM token.
 */

export class NotificationService {
  DEVICE_MAPPING_ENDPOINT = 'device-mapping';
  constructor(notificationBaseUrl = 'https://vcdemo.crabdance.com') {
    this.notificationBaseUrl = notificationBaseUrl;
    console.log('[NotificationService] Initialized with base URL:', this.notificationBaseUrl);
  }

  /**
   * Register device for push notifications
   * Maps CPF number to FCM device token
   *
   * @param cpfNumber - User's CPF number (Brazilian tax ID)
   * @param deviceFcmToken - Firebase Cloud Messaging token for the device
   * @returns Response indicating success or failure
   */
  async registerDeviceMapping(cpfNumber, deviceFcmToken) {
    try {
      console.log('[NotificationService] Registering device mapping');
      console.log('[NotificationService] CPF:', cpfNumber);
      console.log('[NotificationService] Token length:', deviceFcmToken.length);

      // Validate inputs
      if (!cpfNumber || cpfNumber.trim().length === 0) {
        throw new Error('Número de CPF é obrigatório / CPF number is required');
      }
      if (!deviceFcmToken || deviceFcmToken.trim().length === 0) {
        throw new Error('Token FCM do dispositivo é obrigatório / Device FCM token is required');
      }

      // Prepare request body
      const requestBody = {
        cpfNumber: cpfNumber.trim(),
        deviceFcmToken: deviceFcmToken.trim()
      };

      // Construct the full URL
      const fullUrl = `${this.notificationBaseUrl}/${this.DEVICE_MAPPING_ENDPOINT}`;
      console.log('[NotificationService] Sending request to:', fullUrl);

      // Make API call
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      console.log('[NotificationService] Response status:', response.status);

      // Parse response
      let responseData;
      const responseText = await response.text();
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.log('[NotificationService] Response is not JSON:', responseText);
        responseData = {
          rawResponse: responseText
        };
      }
      console.log('[NotificationService] Response data:', responseData);
      if (!response.ok) {
        console.error('[NotificationService] API error:', response.status, responseData);
        return {
          success: false,
          error: responseData.error || responseData.message || `HTTP ${response.status}: ${response.statusText}`,
          data: responseData
        };
      }

      // Success
      console.log('[NotificationService] Device mapping registered successfully');
      return {
        success: true,
        message: responseData.message || 'Mapeamento de dispositivo registrado com sucesso / Device mapping registered successfully',
        data: responseData
      };
    } catch (error) {
      console.error('[NotificationService] Error registering device mapping:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido / Unknown error occurred'
      };
    }
  }

  /**
   * Update the notification base URL
   * @param url - New base URL for the notification API (e.g., https://noty.whatever-vcdemo.crabdance.com/)
   */
  setNotificationBaseUrl(url) {
    this.notificationBaseUrl = url;
    console.log('[NotificationService] Notification base URL updated to:', url);
  }

  /**
   * Get the current notification base URL
   * @returns Current notification base URL
   */
  getNotificationBaseUrl() {
    return this.notificationBaseUrl;
  }

  /**
   * Get the full device mapping URL
   * @returns Full URL for device mapping endpoint
   */
  getDeviceMappingUrl() {
    return `${this.notificationBaseUrl}/${this.DEVICE_MAPPING_ENDPOINT}`;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
//# sourceMappingURL=NotificationService.js.map