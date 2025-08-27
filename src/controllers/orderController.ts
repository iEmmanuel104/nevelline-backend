import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { EmailService } from '../services/emailService';

// Create new order (Public)
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items,
      subtotal,
      shipping = 0,
      paymentMethod,
      paymentReference,
      notes
    } = req.body;

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !items || !paymentMethod) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Order must contain at least one item'
      });
      return;
    }

    // Validate and calculate totals
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      logger.info(`Looking up product: ${item.productId}`);
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        logger.error(`Invalid product ID format: ${item.productId}`);
        res.status(400).json({
          success: false,
          error: `Invalid product ID format: ${item.productId}`
        });
        return;
      }
      
      const product = await Product.findById(item.productId);
      
      if (!product) {
        logger.error(`Product not found: ${item.productId}`);
        res.status(400).json({
          success: false,
          error: `Product ${item.productId} not found`
        });
        return;
      }

      logger.info(`Product found: ${product.name}, price: ${product.price}, stock: ${product.quantity}`);

      if (!product.inStock || product.quantity < item.quantity) {
        res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.name}`
        });
        return;
      }

      const itemTotal = product.price * item.quantity;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        productId: product._id?.toString() || product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image,
        color: item.color || undefined,
        size: item.size || undefined
      });
    }

    const total = calculatedSubtotal + shipping;

    // Generate unique order number
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderNumber = `ORD-${timestamp}-${randomSuffix}`;

    // Create order
    const orderData = {
      orderNumber,
      orderType: 'store', // Mark as store order (from e-commerce platform)
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      shipping,
      total,
      paymentMethod,
      paymentReference,
      notes
    };

    logger.info('Creating order with data:', orderData);

    const order = new Order(orderData);
    
    // Debug: Check if orderNumber is set before saving
    logger.info('Order object before save:', {
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      customerEmail: order.customerEmail,
      total: order.total
    });
    
    await order.save();

    logger.info('Order created successfully:', { 
      orderNumber: order.orderNumber, 
      orderId: order._id,
      total: order.total
    });

    // Send order confirmation email
    try {
      const emailSent = await EmailService.sendOrderConfirmation({
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        orderNumber: order.orderNumber,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        orderDate: order.createdAt.toISOString(),
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference
      });

      if (emailSent) {
        logger.info('Order confirmation email sent', { orderNumber: order.orderNumber });
      } else {
        logger.warn('Failed to send order confirmation email', { orderNumber: order.orderNumber });
      }
    } catch (emailError) {
      logger.error('Error sending order confirmation email', { 
        orderNumber: order.orderNumber, 
        error: emailError 
      });
      // Don't fail the order creation if email fails
    }

    // Update product stock
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: { quantity: -item.quantity }
        }
      );

      // Update inStock status if quantity becomes 0
      const updatedProduct = await Product.findById(item.productId);
      if (updatedProduct && updatedProduct.quantity === 0) {
        updatedProduct.inStock = false;
        updatedProduct.badge = 'SOLD OUT';
        await updatedProduct.save();
      }
    }

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
};

// Get orders (Admin)
export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      paymentStatus,
      orderType,
      search,
      page = '1',
      limit = '20',
      startDate,
      endDate,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (orderType) {
      filter.orderType = orderType;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort as string)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
};

// Get single order (Admin/Customer via order number)
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Try to find by ID or order number
    const order = await Order.findOne({
      $or: [
        { _id: id },
        { orderNumber: id }
      ]
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
};

// Update order status (Admin)
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, notes } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    // Store old status for email notification
    const oldStatus = order.status;

    // Update order fields
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (notes !== undefined) order.notes = notes;

    await order.save();

    // Send status update email if status changed
    if (status && status !== oldStatus) {
      try {
        const emailSent = await EmailService.sendOrderStatusUpdate(
          order.customerEmail,
          order.customerName,
          order.orderNumber,
          oldStatus,
          status
        );

        if (emailSent) {
          logger.info('Order status update email sent', { 
            orderNumber: order.orderNumber,
            oldStatus,
            newStatus: status
          });
        }
      } catch (emailError) {
        logger.error('Error sending order status update email', { 
          orderNumber: order.orderNumber, 
          error: emailError 
        });
        // Don't fail the status update if email fails
      }
    }

    res.json({
      success: true,
      order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    logger.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order'
    });
  }
};

// Cancel order (Admin/Customer)
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      res.status(400).json({
        success: false,
        error: `Cannot cancel order with status: ${order.status}`
      });
      return;
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.quantity += item.quantity;
        product.inStock = true;
        
        // Remove SOLD OUT badge if restocking
        if (product.badge === 'SOLD OUT') {
          product.badge = undefined;
        }
        
        await product.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.json({
      success: true,
      order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
};

// Get order statistics (Admin)
export const getOrderStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      monthlyRevenue,
      dailyOrders,
      topCustomers,
      recentOrders
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.aggregate([
        { $match: { status: 'completed', paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        {
          $match: {
            status: 'completed',
            paymentStatus: 'paid',
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),
      Order.aggregate([
        {
          $group: {
            _id: '$customerEmail',
            customerName: { $first: '$customerName' },
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$total' }
          }
        },
        { $sort: { totalOrders: -1 } },
        { $limit: 5 }
      ]),
      Order.find()
        .sort('-createdAt')
        .limit(10)
        .select('orderNumber customerName total status createdAt')
        .lean()
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        dailyOrders,
        topCustomers,
        recentOrders
      }
    });
  } catch (error) {
    logger.error('Error getting order stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order statistics'
    });
  }
};

// Get customer orders by email
export const getCustomerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required'
      });
      return;
    }

    const orders = await Order.find({ customerEmail: email })
      .sort('-createdAt')
      .lean();

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    logger.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer orders'
    });
  }
};