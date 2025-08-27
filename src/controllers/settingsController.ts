import { Request, Response } from 'express';
import Settings from '../models/Settings';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

// Get site settings (Public)
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      // Create default settings if none exist
      settings = new Settings({});
      await settings.save();
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
};

// Update site settings (Admin)
export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updateData = req.body;

    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings(updateData);
    } else {
      Object.assign(settings, updateData);
    }

    await settings.save();

    res.json({
      success: true,
      settings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
};

// Get specific setting section (Public)
export const getSettingSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { section } = req.params;

    const settings = await Settings.findOne();

    if (!settings) {
      res.status(404).json({
        success: false,
        error: 'Settings not found'
      });
      return;
    }

    const sectionData = (settings as any)[section];

    if (sectionData === undefined) {
      res.status(404).json({
        success: false,
        error: 'Settings section not found'
      });
      return;
    }

    res.json({
      success: true,
      [section]: sectionData
    });
  } catch (error) {
    logger.error('Error fetching setting section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch setting section'
    });
  }
};

// Update specific setting section (Admin)
export const updateSettingSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { section } = req.params;
    const updateData = req.body;

    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings({});
    }

    // Update the specific section
    (settings as any)[section] = {
      ...(settings as any)[section],
      ...updateData
    };

    await settings.save();

    res.json({
      success: true,
      [section]: (settings as any)[section],
      message: `${section} settings updated successfully`
    });
  } catch (error) {
    logger.error('Error updating setting section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update setting section'
    });
  }
};