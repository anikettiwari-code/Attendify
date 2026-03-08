/**
 * Fingerprint Scanner Service
 * Handles real fingerprint scanning using WebUSB API
 */

interface FingerprintScanner {
    vendorId: number;
    productId: number;
    name: string;
}

interface ScannedFingerprint {
    template: string; // Base64 encoded fingerprint template
    quality: number;  // Quality score 0-100
    timestamp: number;
}

// Common fingerprint scanner USB IDs (examples)
const SUPPORTED_SCANNERS: FingerprintScanner[] = [
    { vendorId: 0x04b8, productId: 0x0122, name: "EPSON Fingerprint Scanner" },
    { vendorId: 0x08ff, productId: 0x1600, name: "AuthenTec AES1600" },
    { vendorId: 0x0483, productId: 0x2016, name: "STMicroelectronics Biometric Coprocessor" },
    // Add more scanner IDs as needed
];

class FingerprintScannerService {
    // Generic device reference without DOM typings
    private device: unknown | null = null;
    private isConnected = false;

    /**
     * Check if WebUSB is supported
     */
    isSupported(): boolean {
        return 'usb' in navigator;
    }

    /**
     * Request permission to access fingerprint scanner
     */
    async requestScanner(): Promise<boolean> {
        if (!this.isSupported()) {
            throw new Error('WebUSB is not supported in this browser');
        }

        try {
            // Request a device
            const nav: any = navigator as any;
            this.device = await nav.usb.requestDevice({
                filters: SUPPORTED_SCANNERS.map(scanner => ({
                    vendorId: scanner.vendorId,
                    productId: scanner.productId
                }))
            });

            // Open the device
            const dev: any = this.device;
            await dev.open();
            await dev.selectConfiguration(1);
            await dev.claimInterface(0);

            this.isConnected = true;
            console.log(`Connected to: ${dev.productName} (${dev.vendorId}:${dev.productId})`);
            return true;
        } catch (error) {
            console.error('Failed to connect to fingerprint scanner:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Scan fingerprint and return template
     */
    async scanFingerprint(): Promise<ScannedFingerprint> {
        if (!this.isConnected || !this.device) {
            throw new Error('Fingerprint scanner not connected');
        }

        try {
            const dev: any = this.device;
            // Send scan command (this is device-specific)
            // Note: Actual commands depend on the scanner model
            const scanCommand = new Uint8Array([
                0x00, // Command header
                0x01, // Scan command
                0x00, 0x00 // Parameters
            ]);

            await dev.transferOut(1, scanCommand);

            // Wait for response (device-specific timing)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Read fingerprint data
            const result = await dev.transferIn(1, 64);
            const data = new Uint8Array(result.data!.buffer);

            // Process the raw fingerprint data
            const template = this.processFingerprintData(data);
            const quality = this.calculateQualityScore(data);

            return {
                template: btoa(String.fromCodePoint(...template)),
                quality,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Fingerprint scan failed:', error);
            throw new Error('Failed to scan fingerprint');
        }
    }

    /**
     * Process raw fingerprint data into template
     * This is a simplified implementation - real processing depends on scanner
     */
    private processFingerprintData(data: Uint8Array): Uint8Array {
        // Extract fingerprint template from raw data
        // This is highly device-specific and would need proper implementation
        // For demo purposes, we'll create a hash-like representation
        const template = new Uint8Array(512); // Typical template size

        // Simple processing - in reality, this would involve:
        // - Minutiae extraction
        // - Template generation
        // - Quality assessment
        for (let i = 0; i < template.length && i < data.length; i++) {
            template[i] = data[i] ^ 0xAA; // Simple transformation
        }

        return template;
    }

    /**
     * Calculate fingerprint quality score
     */
    private calculateQualityScore(data: Uint8Array): number {
        // Simple quality calculation based on data variance
        let sum = 0;
        let sumSquares = 0;

        for (const byte of data) {
            sum += byte;
            sumSquares += byte * byte;
        }

        const mean = sum / data.length;
        const variance = (sumSquares / data.length) - (mean * mean);
        const quality = Math.min(100, Math.max(0, variance / 100));

        return Math.round(quality);
    }

    /**
     * Disconnect from scanner
     */
    async disconnect(): Promise<void> {
        if (this.device && this.isConnected) {
            try {
                const dev: any = this.device;
                await dev.close();
            } catch (error) {
                console.error('Error disconnecting scanner:', error);
            }
            this.device = null;
            this.isConnected = false;
        }
    }

    /**
     * Get connection status
     */
    isDeviceConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Get list of supported scanners for display
     */
    getSupportedScanners(): FingerprintScanner[] {
        return SUPPORTED_SCANNERS;
    }
}

// Export singleton instance
export const fingerprintScanner = new FingerprintScannerService();

// Utility functions for UI integration
export const fingerprintUtils = {
    /**
     * Format fingerprint template for display
     */
    formatTemplate(template: string): string {
        return template.substring(0, 16) + '...' + template.substring(template.length - 16);
    },

    /**
     * Get quality color for UI
     */
    getQualityColor(quality: number): string {
        if (quality >= 80) return '#10b981'; // Green
        if (quality >= 60) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    },

    /**
     * Get quality label
     */
    getQualityLabel(quality: number): string {
        if (quality >= 80) return 'Excellent';
        if (quality >= 60) return 'Good';
        if (quality >= 40) return 'Fair';
        return 'Poor';
    }
};