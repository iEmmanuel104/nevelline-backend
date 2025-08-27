import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order from '../models/Order';
import { logger } from '../utils/logger';

// Get customers with analytics
export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    const searchQuery = search 
      ? {
          $or: [
            { customerEmail: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { customerPhone: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    // Aggregation pipeline to get customer analytics
    const pipeline = [
      { $match: searchQuery },
      {
        $group: {
          _id: '$customerEmail',
          customerName: { $first: '$customerName' },
          customerEmail: { $first: '$customerEmail' },
          customerPhone: { $first: '$customerPhone' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          firstOrderDate: { $min: '$createdAt' },
          lastOrderDate: { $max: '$createdAt' },
          orders: { $push: '$_id' }
        }
      },
      {
        $addFields: {
          averageOrderValue: { $divide: ['$totalSpent', '$totalOrders'] },
          createdAt: '$firstOrderDate',
          lastSeen: '$lastOrderDate'
        }
      }
    ];

    // Get total count for pagination
    const totalPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await Order.aggregate(totalPipeline);
    const totalItems = totalResult[0]?.total || 0;

    // Get customers with pagination and sorting
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';
    
    const customers = await Order.aggregate([
      ...pipeline,
      { $sort: { [sortField]: sortDirection } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          _id: 1,
          customerName: 1,
          customerEmail: 1,
          customerPhone: 1,
          stats: {
            totalOrders: '$totalOrders',
            totalSpent: '$totalSpent',
            averageOrderValue: '$averageOrderValue',
            firstOrderDate: '$firstOrderDate',
            lastOrderDate: '$lastOrderDate'
          },
          createdAt: '$firstOrderDate',
          lastSeen: '$lastOrderDate',
          email: '$customerEmail',
          name: '$customerName',
          phone: '$customerPhone'
        }
      }
    ]);

    // Calculate pagination
    const totalPages = Math.ceil(totalItems / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Get overall statistics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const totalStats = await Order.aggregate([
      {
        $group: {
          _id: '$customerEmail',
          customerName: { $first: '$customerName' },
          totalSpent: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          firstOrderDate: { $min: '$createdAt' }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          averageLifetimeValue: { $avg: '$totalSpent' },
          newCustomersThisMonth: {
            $sum: {
              $cond: [
                { $gte: ['$firstOrderDate', currentMonth] },
                1,
                0
              ]
            }
          },
          returningCustomers: {
            $sum: {
              $cond: [
                { $gt: ['$totalOrders', 1] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const stats = totalStats[0] || {
      totalCustomers: 0,
      averageLifetimeValue: 0,
      newCustomersThisMonth: 0,
      returningCustomers: 0
    };

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          hasNext,
          hasPrev
        },
        totalStats: stats
      }
    });

  } catch (error) {
    logger.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers'
    });
  }
};

// Export customer data as CSV
export const exportCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customers = await Order.aggregate([
      {
        $group: {
          _id: '$customerEmail',
          customerName: { $first: '$customerName' },
          customerEmail: { $first: '$customerEmail' },
          customerPhone: { $first: '$customerPhone' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          firstOrderDate: { $min: '$createdAt' },
          lastOrderDate: { $max: '$createdAt' }
        }
      },
      {
        $addFields: {
          averageOrderValue: { $divide: ['$totalSpent', '$totalOrders'] }
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);

    // Generate CSV content
    const csvHeader = 'Email,Name,Phone,Total Orders,Total Spent,Average Order Value,First Order,Last Order\n';
    const csvRows = customers.map(customer => {
      const formatDate = (date: Date) => date ? new Date(date).toISOString().split('T')[0] : '';
      
      return [
        customer.customerEmail || '',
        customer.customerName || '',
        customer.customerPhone || '',
        customer.totalOrders,
        customer.totalSpent,
        Math.round(customer.averageOrderValue || 0),
        formatDate(customer.firstOrderDate),
        formatDate(customer.lastOrderDate)
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csvContent);

  } catch (error) {
    logger.error('Error exporting customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export customers'
    });
  }
};

// Get customer details by email
export const getCustomerByEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.params;

    const customerOrders = await Order.find({ 
      customerEmail: email 
    }).sort({ createdAt: -1 });

    if (customerOrders.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }

    const customer = {
      email: customerOrders[0].customerEmail,
      name: customerOrders[0].customerName,
      phone: customerOrders[0].customerPhone,
      orders: customerOrders,
      stats: {
        totalOrders: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, order) => sum + order.total, 0),
        averageOrderValue: customerOrders.reduce((sum, order) => sum + order.total, 0) / customerOrders.length,
        firstOrderDate: customerOrders[customerOrders.length - 1].createdAt,
        lastOrderDate: customerOrders[0].createdAt
      }
    };

    res.json({
      success: true,
      data: customer
    });

  } catch (error) {
    logger.error('Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer details'
    });
  }
};