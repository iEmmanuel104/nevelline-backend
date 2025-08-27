import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Product from '../models/Product';
import Category from '../models/Category';
import Order from '../models/Order';
import Admin from '../models/Admin';
import { listTransactions } from '../utils/paystack';
import { logger } from '../utils/logger';

// Get dashboard overview statistics
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));

    // Get basic counts
    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalCategories,
      activeCategories,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      dailyRevenue,
      monthlyOrders,
      weeklyOrders,
      dailyOrders
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ active: true, inStock: true }),
      Product.countDocuments({ inStock: false }),
      Category.countDocuments(),
      Category.countDocuments({ active: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'completed', paymentStatus: 'paid' }),
      
      // Revenue calculations
      Order.aggregate([
        { $match: { status: 'completed', paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { 
          $match: { 
            status: 'completed', 
            paymentStatus: 'paid',
            createdAt: { $gte: startOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { 
          $match: { 
            status: 'completed', 
            paymentStatus: 'paid',
            createdAt: { $gte: startOfWeek }
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { 
          $match: { 
            status: 'completed', 
            paymentStatus: 'paid',
            createdAt: { $gte: startOfDay }
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Order counts by period
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Order.countDocuments({ createdAt: { $gte: startOfDay } })
    ]);

    // Calculate growth rates (compared to previous periods)
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthRevenue = await Order.aggregate([
      { 
        $match: { 
          status: 'completed', 
          paymentStatus: 'paid',
          createdAt: { 
            $gte: previousMonth,
            $lt: startOfMonth
          }
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const revenueGrowth = previousMonthRevenue[0]?.total > 0 
      ? ((monthlyRevenue[0]?.total || 0) - previousMonthRevenue[0].total) / previousMonthRevenue[0].total * 100
      : 0;

    res.json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          active: activeProducts,
          outOfStock: outOfStockProducts,
          lowStock: await Product.countDocuments({ quantity: { $lt: 10, $gt: 0 } })
        },
        categories: {
          total: totalCategories,
          active: activeCategories
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders,
          processing: await Order.countDocuments({ status: 'processing' }),
          cancelled: await Order.countDocuments({ status: 'cancelled' }),
          monthly: monthlyOrders,
          weekly: weeklyOrders,
          daily: dailyOrders
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0,
          weekly: weeklyRevenue[0]?.total || 0,
          daily: dailyRevenue[0]?.total || 0,
          growth: Math.round(revenueGrowth * 100) / 100
        }
      }
    });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard statistics'
    });
  }
};

// Get recent activities
export const getRecentActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string);

    const [recentOrders, recentProducts, lowStockProducts] = await Promise.all([
      Order.find()
        .sort('-createdAt')
        .limit(limitNum)
        .select('orderNumber customerName total status createdAt')
        .lean(),
      
      Product.find({ active: true })
        .sort('-createdAt')
        .limit(limitNum)
        .select('name price category createdAt')
        .lean(),
      
      Product.find({ 
        active: true,
        quantity: { $lt: 10, $gt: 0 }
      })
        .sort('quantity')
        .limit(limitNum)
        .select('name quantity category')
        .lean()
    ]);

    const activities = [
      ...recentOrders.map(order => ({
        type: 'order',
        title: `New order #${order.orderNumber}`,
        description: `${order.customerName} - ₦${order.total.toLocaleString()}`,
        status: order.status,
        timestamp: order.createdAt,
        id: order._id
      })),
      ...recentProducts.map(product => ({
        type: 'product',
        title: 'New product added',
        description: `${product.name} - ₦${product.price.toLocaleString()}`,
        category: product.category,
        timestamp: product.createdAt,
        id: product._id
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, limitNum);

    res.json({
      success: true,
      data: {
        activities,
        lowStockProducts
      }
    });
  } catch (error) {
    logger.error('Error getting recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent activity'
    });
  }
};

// Get sales analytics
export const getSalesAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Daily sales data
    const dailySales = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          paymentStatus: 'paid',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          paymentStatus: 'paid',
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Sales by category
    const categoryStats = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          paymentStatus: 'paid',
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orders: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        period,
        dailySales,
        topProducts,
        categoryStats
      }
    });
  } catch (error) {
    logger.error('Error getting sales analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sales analytics'
    });
  }
};

// Get customer analytics
export const getCustomerAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [topCustomers, customerGrowth] = await Promise.all([
      // Top customers by total spent
      Order.aggregate([
        {
          $match: {
            status: 'completed',
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: '$customerEmail',
            customerName: { $first: '$customerName' },
            totalSpent: { $sum: '$total' },
            orderCount: { $sum: 1 },
            lastOrder: { $max: '$createdAt' }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
      ]),

      // Customer growth over last 12 months
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            newCustomers: { $addToSet: '$customerEmail' }
          }
        },
        {
          $addFields: {
            customerCount: { $size: '$newCustomers' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        topCustomers,
        customerGrowth
      }
    });
  } catch (error) {
    logger.error('Error getting customer analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer analytics'
    });
  }
};

// Get inventory alerts
export const getInventoryAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [outOfStock, lowStock, overStock] = await Promise.all([
      Product.find({ 
        active: true,
        inStock: false 
      })
        .select('name category quantity')
        .lean(),
      
      Product.find({ 
        active: true,
        quantity: { $lt: 10, $gt: 0 }
      })
        .select('name category quantity')
        .sort('quantity')
        .lean(),
      
      Product.find({ 
        active: true,
        quantity: { $gt: 100 }
      })
        .select('name category quantity')
        .sort('-quantity')
        .limit(20)
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        outOfStock: outOfStock.length,
        lowStock: lowStock.length,
        overStock: overStock.length,
        alerts: {
          outOfStock,
          lowStock,
          overStock
        }
      }
    });
  } catch (error) {
    logger.error('Error getting inventory alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory alerts'
    });
  }
};