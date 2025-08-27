import { Request, Response } from 'express';
import Category from '../models/Category';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

// Get all categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { active = 'true' } = req.query;

    const filter: any = {};
    if (active !== 'all') {
      filter.active = active === 'true';
    }

    const categories = await Category.find(filter)
      .sort('order name')
      .lean();

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
};

// Get single category by slug
export const getCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug });

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Category not found'
      });
      return;
    }

    res.json({
      success: true,
      category
    });
  } catch (error) {
    logger.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category'
    });
  }
};

// Create new category (Admin)
export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categoryData = req.body;

    // Auto-generate slug if not provided
    if (!categoryData.slug && categoryData.name) {
      categoryData.slug = categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    // Check if slug already exists
    const existing = await Category.findOne({ slug: categoryData.slug });
    if (existing) {
      res.status(400).json({
        success: false,
        error: 'Category with this slug already exists'
      });
      return;
    }

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      category,
      message: 'Category created successfully'
    });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
};

// Update category (Admin)
export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If updating slug, check for uniqueness
    if (updateData.slug) {
      const existing = await Category.findOne({ 
        slug: updateData.slug,
        _id: { $ne: id }
      });
      
      if (existing) {
        res.status(400).json({
          success: false,
          error: 'Category with this slug already exists'
        });
        return;
      }
    }

    const category = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Category not found'
      });
      return;
    }

    // If slug was changed, update all products
    if (updateData.slug && updateData.slug !== category.slug) {
      await Product.updateMany(
        { category: category.slug },
        { category: updateData.slug }
      );
    }

    res.json({
      success: true,
      category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
};

// Delete category (Admin)
export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Category not found'
      });
      return;
    }

    // Check if there are products in this category
    const productCount = await Product.countDocuments({ category: category.slug });
    
    if (productCount > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete category with ${productCount} products. Please reassign or delete products first.`
      });
      return;
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
};

// Reorder categories (Admin)
export const reorderCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryOrder } = req.body;

    if (!Array.isArray(categoryOrder)) {
      res.status(400).json({
        success: false,
        error: 'Invalid category order data'
      });
      return;
    }

    // Update each category's order
    const updatePromises = categoryOrder.map((item, index) => 
      Category.findByIdAndUpdate(item.id, { order: index })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    logger.error('Error reordering categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder categories'
    });
  }
};

// Update category product counts (Admin)
export const updateProductCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await Category.find();

    for (const category of categories) {
      const count = await Product.countDocuments({ 
        category: category.slug,
        active: true
      });
      
      category.productCount = count;
      await category.save();
    }

    res.json({
      success: true,
      message: 'Product counts updated successfully'
    });
  } catch (error) {
    logger.error('Error updating product counts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product counts'
    });
  }
};