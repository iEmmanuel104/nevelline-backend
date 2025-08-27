import axios from 'axios';
import { logger } from './logger';

export interface QRCodeOptions {
    size?: number;
    format?: 'png' | 'svg' | 'eps' | 'pdf';
    color?: string;
    backgroundColor?: string;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    logo?: string; // URL to logo image
    logoSize?: number;
}

export interface BrandedQRCodeOptions extends QRCodeOptions {
    storeName?: string;
    storeSlogan?: string;
    brandColors?: {
        primary: string;
        secondary: string;
        text: string;
    };
}

// Generate QR code URL with custom styling
export const generateStyledQRCode = (
    paymentUrl: string,
    options: QRCodeOptions = {}
): string => {
    const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/';

    const params = new URLSearchParams({
        size: `${options.size || 300}x${options.size || 300}`,
        format: options.format || 'png',
        data: paymentUrl,
        color: (options.color || '000000').replace('#', ''),
        bgcolor: (options.backgroundColor || 'ffffff').replace('#', ''),
        margin: (options.margin || 10).toString(),
        ecc: options.errorCorrectionLevel || 'M'
    });

    const qrUrl = `${qrApiUrl}?${params.toString()}`;

    logger.info('Generated QR code URL:', {
        url: qrUrl.substring(0, 100) + '...',
        size: options.size || 300,
        format: options.format || 'png'
    });

    return qrUrl;
};

// Generate branded QR code with Nevellines styling
export const generateBrandedQRCode = (
    paymentUrl: string,
    amount: number,
    options: BrandedQRCodeOptions = {}
): string => {
    // Use Nevellines brand colors
    const brandOptions: QRCodeOptions = {
        size: options.size || 400,
        format: options.format || 'png',
        color: options.brandColors?.primary || '2563eb', // Blue
        backgroundColor: options.brandColors?.secondary || 'ffffff', // White
        margin: options.margin || 15,
        errorCorrectionLevel: 'M',
        ...options
    };

    return generateStyledQRCode(paymentUrl, brandOptions);
};

// Generate downloadable QR code with additional branding elements
export const generateDownloadableQRCode = async (
    paymentUrl: string,
    paymentDetails: {
        amount: number;
        productName?: string;
        reference: string;
        storeName?: string;
    },
    options: BrandedQRCodeOptions = {}
): Promise<{
    qrCodeUrl: string;
    downloadUrl: string;
    fileName: string;
}> => {
    try {
        const qrCodeUrl = generateBrandedQRCode(paymentUrl, paymentDetails.amount, options);

        // For now, return the same URL for download
        // In a production environment, you might want to:
        // 1. Generate the QR code on your server
        // 2. Add branding elements (logo, text, borders)
        // 3. Store it temporarily for download

        const fileName = `nevellines-payment-qr-${paymentDetails.reference}.png`;

        return {
            qrCodeUrl,
            downloadUrl: qrCodeUrl,
            fileName
        };
    } catch (error) {
        logger.error('Error generating downloadable QR code:', error);
        throw error;
    }
};

// Generate QR code with custom branding frame
export const generateFramedQRCode = (
    paymentUrl: string,
    frameOptions: {
        title: string;
        subtitle?: string;
        amount: number;
        currency?: string;
        brandColor?: string;
    }
): string => {
    // This would ideally be implemented with a custom QR code generation service
    // that can add frames, text, and branding elements

    // For now, return a styled QR code
    return generateStyledQRCode(paymentUrl, {
        size: 400,
        color: frameOptions.brandColor || '2563eb',
        backgroundColor: 'ffffff',
        margin: 20,
        errorCorrectionLevel: 'M'
    });
};

// Validate QR code URL
export const validateQRCode = async (qrCodeUrl: string): Promise<boolean> => {
    try {
        const response = await axios.head(qrCodeUrl, { timeout: 5000 });
        return response.status === 200;
    } catch (error) {
        logger.error('QR code validation failed:', error);
        return false;
    }
};

// Get QR code analytics (for future use)
export interface QRCodeAnalytics {
    scans: number;
    uniqueScans: number;
    lastScanned?: Date;
    deviceTypes: {
        mobile: number;
        desktop: number;
        tablet: number;
    };
    locations: {
        country: string;
        count: number;
    }[];
}

export const getQRCodeAnalytics = async (reference: string): Promise<QRCodeAnalytics> => {
    // This would be implemented with a QR code analytics service
    // For now, return mock data
    return {
        scans: 0,
        uniqueScans: 0,
        deviceTypes: {
            mobile: 0,
            desktop: 0,
            tablet: 0
        },
        locations: []
    };
};

// Generate multiple QR code formats for different use cases
export const generateQRCodeSet = (paymentUrl: string, reference: string) => {
    return {
        // Small size for mobile/email
        small: generateStyledQRCode(paymentUrl, {
            size: 200,
            format: 'png',
            color: '2563eb',
            backgroundColor: 'ffffff'
        }),

        // Medium size for web display
        medium: generateStyledQRCode(paymentUrl, {
            size: 300,
            format: 'png',
            color: '2563eb',
            backgroundColor: 'ffffff'
        }),

        // Large size for printing
        large: generateStyledQRCode(paymentUrl, {
            size: 500,
            format: 'png',
            color: '000000',
            backgroundColor: 'ffffff',
            margin: 25
        }),

        // Vector format for high-quality printing
        vector: generateStyledQRCode(paymentUrl, {
            size: 400,
            format: 'svg',
            color: '2563eb',
            backgroundColor: 'ffffff'
        })
    };
};