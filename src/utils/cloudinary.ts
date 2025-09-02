import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

// Configure Cloudinary (only for admin operations like deletion)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload preset configurations for different types
export const UPLOAD_PRESETS = {
    PRODUCTS: 'nevelline_products',
    CATEGORIES: 'nevelline_categories',
    BANNERS: 'nevelline_banners',
    GENERAL: 'nevelline_general'
};

// Generate Cloudinary widget configuration for frontend use
export const generateCloudinaryConfig = (preset: string, options: any = {}) => {
    return {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        uploadPreset: preset,
        sources: ['local', 'url', 'camera'],
        multiple: false,
        resourceType: 'image',
        maxFileSize: 5000000, // 5MB
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        folder: options.folder || 'nevelline',
        transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            ...(options.transformation || [])
        ],
        cropping: true,
        croppingAspectRatio: options.aspectRatio || 1,
        showSkipCropButton: false,
        croppingDefaultSelectionRatio: 0.9,
        styles: {
            palette: {
                window: '#FFFFFF',
                windowBorder: '#90A0B3',
                tabIcon: '#0078FF',
                menuIcons: '#5A616A',
                textDark: '#000000',
                textLight: '#FFFFFF',
                link: '#0078FF',
                action: '#FF620C',
                inactiveTabIcon: '#0E2F5A',
                error: '#F44235',
                inProgress: '#0078FF',
                complete: '#20B832',
                sourceBg: '#E4EBF1'
            },
            fonts: {
                default: null,
                'sans-serif': {
                    url: null,
                    active: true
                }
            }
        },
        ...options
    };
};

// Delete image from Cloudinary (admin function)
export const deleteImage = async (public_id: string) => {
    try {
        const result = await cloudinary.uploader.destroy(public_id);
        return {
            success: result.result === 'ok',
            result: result.result
        };
    } catch (error) {
        logger.error('Cloudinary delete error:', error);
        return {
            success: false,
            error: 'Image deletion failed'
        };
    }
};

// Get image details (admin function)
export const getImageDetails = async (public_id: string) => {
    try {
        const result = await cloudinary.api.resource(public_id);
        return {
            success: true,
            data: {
                public_id: result.public_id,
                url: result.secure_url,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes,
                created_at: result.created_at
            }
        };
    } catch (error) {
        logger.error('Cloudinary resource error:', error);
        return {
            success: false,
            error: 'Failed to get image details'
        };
    }
};

// Optimize image URL with transformations (utility function)
export const optimizeImageUrl = (
    publicId: string,
    options: {
        width?: number;
        height?: number;
        quality?: string | number;
        format?: string;
        crop?: string;
    } = {}
) => {
    const transformations: any[] = [];

    if (options.width || options.height) {
        transformations.push({
            width: options.width,
            height: options.height,
            crop: options.crop || 'fill'
        });
    }

    if (options.quality) {
        transformations.push({ quality: options.quality });
    }

    if (options.format) {
        transformations.push({ format: options.format });
    } else {
        transformations.push({ fetch_format: 'auto' });
    }

    return cloudinary.url(publicId, {
        transformation: transformations,
        secure: true
    });
};

export default cloudinary;