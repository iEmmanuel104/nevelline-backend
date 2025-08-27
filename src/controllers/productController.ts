import { Request, Response } from 'express';
import Product from '../models/Product';
import Category from '../models/Category';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

// Transform product data for frontend compatibility
const transformProduct = (product: any) => {
  return {
    ...product,
    id: product._id.toString(), // Add id field for frontend
    stock: product.quantity,
    isActive: product.active,
    tags: product.tags || [],
    // Keep original image and backImage for ProductCard/ProductQuickView
    // Add images array for admin panel compatibility
    images: [product.image, product.backImage, ...(product.gallery || [])].filter(Boolean)
  };
};

// Get all products with filters
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      badge,
      inStock,
      featured,
      trending,
      page = '1',
      limit = '12',
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter: any = { active: true };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (badge) {
      filter.badge = badge;
    }

    if (inStock !== undefined) {
      filter.inStock = inStock === 'true';
    }

    if (featured !== undefined) {
      filter.featured = featured === 'true';
    }

    if (trending !== undefined) {
      filter.trending = trending === 'true';
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get products with pagination
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort as string)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      products: products.map(transformProduct),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
};

// Get single product by ID
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    res.json({
      success: true,
      product: transformProduct(product.toObject())
    });
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    });
  }
};

// Get featured products
export const getFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({
      active: true,
      featured: true,
      inStock: true
    })
      .limit(8)
      .sort('-createdAt')
      .lean();

    res.json({
      success: true,
      products: products.map(transformProduct)
    });
  } catch (error) {
    logger.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured products'
    });
  }
};

// Get trending products
export const getTrendingProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({
      active: true,
      trending: true,
      inStock: true
    })
      .limit(8)
      .sort('-createdAt')
      .lean();

    res.json({
      success: true,
      products: products.map(transformProduct)
    });
  } catch (error) {
    logger.error('Error fetching trending products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending products'
    });
  }
};

// Get products by category
export const getProductsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    const { page = '1', limit = '12' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find({ category, active: true, inStock: true })
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments({ category, active: true, inStock: true })
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalProducts: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
};

// Create new product (Admin)
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const productData = req.body;

    // Calculate discount if prices provided
    if (productData.originalPrice && productData.price) {
      productData.discount = Math.round(
        ((productData.originalPrice - productData.price) / productData.originalPrice) * 100
      );
    }

    // Validate category exists
    if (productData.category) {
      const categoryExists = await Category.findOne({
        slug: productData.category,
        active: true
      });

      if (!categoryExists) {
        res.status(400).json({
          success: false,
          error: 'Invalid category'
        });
        return;
      }
    }

    const product = new Product(productData);
    await product.save();

    // Update category product count
    if (productData.category) {
      await Category.updateOne(
        { slug: productData.category },
        { $inc: { productCount: 1 } }
      );
    }

    res.status(201).json({
      success: true,
      product,
      message: 'Product created successfully'
    });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product'
    });
  }
};

// Update product (Admin)
export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Calculate discount if prices provided
    if (updateData.originalPrice && updateData.price) {
      updateData.discount = Math.round(
        ((updateData.originalPrice - updateData.price) / updateData.originalPrice) * 100
      );
    }

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    // If category is being changed, update counts
    if (updateData.category && updateData.category !== product.category) {
      // Validate new category
      const newCategory = await Category.findOne({
        slug: updateData.category,
        active: true
      });

      if (!newCategory) {
        res.status(400).json({
          success: false,
          error: 'Invalid category'
        });
        return;
      }

      // Update old category count
      await Category.updateOne(
        { slug: product.category },
        { $inc: { productCount: -1 } }
      );

      // Update new category count
      await Category.updateOne(
        { slug: updateData.category },
        { $inc: { productCount: 1 } }
      );
    }

    // Update product
    Object.assign(product, updateData);
    await product.save();

    res.json({
      success: true,
      product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product'
    });
  }
};

// Delete product (Admin)
export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    // Update category count
    if (product.category) {
      await Category.updateOne(
        { slug: product.category },
        { $inc: { productCount: -1 } }
      );
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product'
    });
  }
};

// Bulk update products (Admin)
export const bulkUpdateProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productIds, updateData } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid product IDs'
      });
      return;
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} products updated successfully`
    });
  } catch (error) {
    logger.error('Error bulk updating products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update products'
    });
  }
};

// Update product stock
export const updateStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    if (operation === 'set') {
      product.quantity = quantity;
    } else if (operation === 'increment') {
      product.quantity += quantity;
    } else if (operation === 'decrement') {
      product.quantity = Math.max(0, product.quantity - quantity);
    }

    product.inStock = product.quantity > 0;

    // Auto-update badge if out of stock
    if (product.quantity === 0) {
      product.badge = 'SOLD OUT';
    }

    await product.save();

    res.json({
      success: true,
      product: {
        id: product._id,
        quantity: product.quantity,
        inStock: product.inStock
      },
      message: 'Stock updated successfully'
    });
  } catch (error) {
    logger.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stock'
    });
  }
};

// Get product statistics (Admin)
export const getProductStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalProducts,
      activeProducts,
      outOfStock,
      lowStock,
      featuredProducts,
      trendingProducts,
      categoryStats
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ active: true }),
      Product.countDocuments({ inStock: false }),
      Product.countDocuments({ quantity: { $lt: 10, $gt: 0 } }),
      Product.countDocuments({ featured: true }),
      Product.countDocuments({ trending: true }),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        outOfStock,
        lowStock,
        featuredProducts,
        trendingProducts,
        byCategory: categoryStats
      }
    });
  } catch (error) {
    logger.error('Error getting product stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product statistics'
    });
  }
};