/**
 * NotificationService - Handles device mapping for push notifications
 *
 * This service registers the device with the notification server by mapping
 * the user's CPF number to their device FCM token.
 */
export interface DeviceMappingRequest {
    cpfNumber: string;
    deviceFcmToken: string;
}
export interface DeviceMappingResponse {
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
}
export declare class NotificationService {
    private notificationBaseUrl;
    private readonly DEVICE_MAPPING_ENDPOINT;
    constructor(notificationBaseUrl?: string);
    /**
     * Register device for push notifications
     * Maps CPF number to FCM device token
     *
     * @param cpfNumber - User's CPF number (Brazilian tax ID)
     * @param deviceFcmToken - Firebase Cloud Messaging token for the device
     * @returns Response indicating success or failure
     */
    registerDeviceMapping(cpfNumber: string, deviceFcmToken: string): Promise<DeviceMappingResponse>;
    /**
     * Update the notification base URL
     * @param url - New base URL for the notification API (e.g., https://noty.whatever-vcdemo.crabdance.com/)
     */
    setNotificationBaseUrl(url: string): void;
    /**
     * Get the current notification base URL
     * @returns Current notification base URL
     */
    getNotificationBaseUrl(): string;
    /**
     * Get the full device mapping URL
     * @returns Full URL for device mapping endpoint
     */
    getDeviceMappingUrl(): string;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=NotificationService.d.ts.map