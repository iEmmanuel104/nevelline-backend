import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
    generateCloudinaryConfig,
    deleteImage,
    getImageDetails,
    UPLOAD_PRESETS
} from '../utils/cloudinary';
import { logger } from '../utils/logger';

// Get Cloudinary widget configuration for frontend
export const getCloudinaryConfig = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { type = 'general' } = req.query;

        let uploadPreset = UPLOAD_PRESETS.GENERAL;
        let folder = 'nevellines';
        let aspectRatio = 1; // Default square

        switch (type) {
            case 'products':
                uploadPreset = UPLOAD_PRESETS.PRODUCTS;
                folder = 'nevellines/products';
                aspectRatio = 0.8; // Portrait for products (4:5 ratio)
                break;
            case 'categories':
                uploadPreset = UPLOAD_PRESETS.CATEGORIES;
                folder = 'nevellines/categories';
                aspectRatio = 1.33; // Landscape for categories (4:3 ratio)
                break;
            case 'banners':
                uploadPreset = UPLOAD_PRESETS.BANNERS;
                folder = 'nevellines/banners';
                aspectRatio = 2.5; // Wide banner ratio
                break;
        }

        const config = generateCloudinaryConfig(uploadPreset, {
            folder,
            aspectRatio,
            transformation: [
                { quality: 'auto:good', fetch_format: 'auto' },
                { flags: 'progressive' }
            ]
        });

        res.json({
            success: true,
            config
        });
    } catch (error) {
        logger.error('Error generating Cloudinary config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate upload configuration'
        });
    }
};

// Delete image from Cloudinary (admin only)
export const deleteImageFromCloud = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { public_id } = req.body;

        if (!public_id) {
            res.status(400).json({
                success: false,
                error: 'Public ID is required'
            });
            return;
        }

        const result = await deleteImage(public_id);

        if (!result.success) {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to delete image'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete image'
        });
    }
};

// Get image details (admin only)
export const getImageInfo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { public_id } = req.params;

        if (!public_id) {
            res.status(400).json({
                success: false,
                error: 'Public ID is required'
            });
            return;
        }

        const result = await getImageDetails(public_id);

        if (!result.success) {
            res.status(404).json({
                success: false,
                error: result.error || 'Image not found'
            });
            return;
        }

        res.json({
            success: true,
            image: result.data
        });
    } catch (error) {
        logger.error('Error fetching image details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch image details'
        });
    }
};