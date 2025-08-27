import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
    createPaymentLink,
    verifyPayment,
    generateQRCode,
    createShortUrl,
    getTransaction,
    listTransactions,
    PaymentLinkData
} from '../utils/paystack';
import Product from '../models/Product';
import Order from '../models/Order';
import PaymentLink from '../models/PaymentLink';
import { logger } from '../utils/logger';
import { EmailService } from '../services/emailService';

// Create payment link (Admin)
export const generatePaymentLink = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            productId,
            customAmount,
            description,
            customerEmail,
            customerName,
            customerPhone,
            quantity = 1,
            sessionTimeoutMinutes = 1440 // 24 hours default
        } = req.body;

        let productName = '';
        let amount = customAmount;

        // If productId is provided, get product details
        if (productId) {
            const product = await Product.findById(productId);
            if (!product) {
                res.status(404).json({
                    success: false,
                    error: 'Product not found'
                });
                return;
            }

            productName = product.name;
            amount = product.price * quantity;
        }

        if (!amount || amount <= 0) {
            res.status(400).json({
                success: false,
                error: 'Amount must be greater than zero'
            });
            return;
        }

        const linkData: PaymentLinkData = {
            productId,
            productName,
            customAmount: amount,
            description: description || productName || 'Payment for Nevellines',
            customerEmail,
            customerName,
            customerPhone,
            quantity,
            metadata: {
                created_by: 'admin',
                created_at: new Date().toISOString(),
                session_timeout_minutes: sessionTimeoutMinutes
            }
        };

        const paymentResult = await createPaymentLink(linkData);

        if (!paymentResult.success) {
            res.status(500).json({
                success: false,
                error: paymentResult.error
            });
            return;
        }

        // Generate QR code and short URL
        const qrCodeUrl = generateQRCode(paymentResult.data!.checkout_url);
        const shortUrl = await createShortUrl(paymentResult.data!.checkout_url);

        // Save payment link to database
        const paymentLink = new PaymentLink({
            reference: paymentResult.data!.reference,
            amount,
            productId,
            productName,
            description: linkData.description,
            customerEmail,
            customerName,
            customerPhone,
            quantity,
            metadata: linkData.metadata,
            authorization_url: paymentResult.data!.authorization_url,
            access_code: paymentResult.data!.access_code,
            checkout_url: paymentResult.data!.checkout_url,
            qrCode: qrCodeUrl,
            shortUrl,
            sessionTimeoutMinutes,
            status: 'pending'
        });

        await paymentLink.save();

        res.json({
            success: true,
            data: {
                paymentUrl: paymentResult.data!.checkout_url,
                shortUrl,
                qrCode: qrCodeUrl,
                reference: paymentResult.data!.reference,
                accessCode: paymentResult.data!.access_code,
                amount,
                productName,
                customerEmail: customerEmail || 'Not provided',
                description: linkData.description,
                expiresAt: paymentLink.expiresAt,
                timeRemainingFormatted: paymentLink.timeRemainingFormatted
            },
            message: 'Payment link generated successfully'
        });
    } catch (error) {
        logger.error('Error generating payment link:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate payment link'
        });
    }
};

// Verify payment (Public)
export const verifyPaymentTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
        const { reference } = req.params;

        if (!reference) {
            res.status(400).json({
                success: false,
                error: 'Payment reference is required'
            });
            return;
        }

        const verification = await verifyPayment(reference);

        if (!verification.success) {
            res.status(400).json({
                success: false,
                error: verification.error
            });
            return;
        }

        const paymentData = verification.data!;

        // If payment is successful, create/update order and update payment link
        if (paymentData.status === 'success') {
            try {
                // Update payment link status first
                const paymentLink = await PaymentLink.findOne({ reference });
                if (paymentLink && paymentLink.status !== 'completed') {
                    paymentLink.status = 'completed';
                    paymentLink.paidAt = new Date();
                    paymentLink.verifiedAt = new Date();
                    await paymentLink.save();

                    logger.info('Payment link status updated to completed:', reference);
                }

                // Create or update order using the helper function
                await createOrderFromPaymentLink(reference, paymentData);
            } catch (orderError) {
                logger.error('Error creating/updating order after payment:', orderError);
                // Don't fail the verification if order creation fails
            }
        } else {
            // Payment failed or pending - update payment link status
            const paymentLink = await PaymentLink.findOne({ reference });
            if (paymentLink && paymentData.status === 'failed') {
                paymentLink.status = 'failed';
                await paymentLink.save();
            }
        }

        res.json({
            success: true,
            data: paymentData,
            message: paymentData.status === 'success' ? 'Payment verified successfully' : 'Payment verification completed'
        });
    } catch (error) {
        logger.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify payment'
        });
    }
};

// Webhook handler for Paystack (Public)
export const handlePaystackWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        const hash = require('crypto')
            .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (hash === req.headers['x-paystack-signature']) {
            const event = req.body;

            logger.info('Paystack webhook received:', event.event);

            // Handle different webhook events
            switch (event.event) {
                case 'charge.success':
                    await handleSuccessfulCharge(event.data);
                    break;
                case 'charge.failed':
                    await handleFailedCharge(event.data);
                    break;
                default:
                    logger.info('Unhandled webhook event:', event.event);
            }

            res.sendStatus(200);
        } else {
            logger.warn('Invalid Paystack webhook signature');
            res.sendStatus(400);
        }
    } catch (error) {
        logger.error('Webhook processing error:', error);
        res.sendStatus(500);
    }
};

// Get transaction details (Admin)
export const getTransactionDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { transactionId } = req.params;

        const transaction = await getTransaction(transactionId);

        if (!transaction.success) {
            res.status(404).json({
                success: false,
                error: transaction.error
            });
            return;
        }

        res.json({
            success: true,
            data: transaction.data
        });
    } catch (error) {
        logger.error('Error getting transaction details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get transaction details'
        });
    }
};

// List transactions (Admin)
export const getTransactionsList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            page = '1',
            perPage = '20',
            status,
            from,
            to
        } = req.query;

        const params = {
            page: parseInt(page as string),
            perPage: parseInt(perPage as string),
            ...(status && { status: status as string }),
            ...(from && { from: from as string }),
            ...(to && { to: to as string })
        };

        const transactions = await listTransactions(params);

        if (!transactions.success) {
            res.status(500).json({
                success: false,
                error: transactions.error
            });
            return;
        }

        res.json({
            success: true,
            data: transactions.data,
            meta: transactions.meta
        });
    } catch (error) {
        logger.error('Error listing transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list transactions'
        });
    }
};

// Helper function to handle successful charges
const handleSuccessfulCharge = async (data: any) => {
    try {
        logger.info('Processing successful charge:', data.reference);

        // Update order status if exists
        const order = await Order.findOne({ paymentReference: data.reference });
        if (order && order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
            order.status = 'processing';
            await order.save();

            logger.info('Order payment status updated:', order.orderNumber);
        }

        // Update payment link status
        const paymentLink = await PaymentLink.findOne({ reference: data.reference });
        if (paymentLink && paymentLink.status !== 'completed') {
            paymentLink.status = 'completed';
            paymentLink.paidAt = new Date();
            paymentLink.verifiedAt = new Date();
            await paymentLink.save();

            logger.info('Payment link status updated to completed:', data.reference);
        }
    } catch (error) {
        logger.error('Error handling successful charge:', error);
    }
};

// Helper function to handle failed charges
const handleFailedCharge = async (data: any) => {
    try {
        logger.info('Processing failed charge:', data.reference);

        // Update order status if exists
        const order = await Order.findOne({ paymentReference: data.reference });
        if (order) {
            order.paymentStatus = 'failed';
            await order.save();

            logger.info('Order payment status updated to failed:', order.orderNumber);
        }

        // Update payment link status
        const paymentLink = await PaymentLink.findOne({ reference: data.reference });
        if (paymentLink) {
            paymentLink.status = 'failed';
            await paymentLink.save();
        }
    } catch (error) {
        logger.error('Error handling failed charge:', error);
    }
};

// Get payment links (Admin)
export const getPaymentLinks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            page = '1',
            limit = '20',
            status,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        // Build search query
        const searchQuery: any = {};

        if (status && status !== 'all') {
            searchQuery.status = status;
        }

        if (search) {
            searchQuery.$or = [
                { reference: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { productName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Update expired links
        await PaymentLink.updateMany(
            {
                expiresAt: { $lt: new Date() },
                status: 'pending'
            },
            { status: 'expired' }
        );

        // Check status of pending payment links older than 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const oldPendingLinks = await PaymentLink.find({
            status: 'pending',
            createdAt: { $lt: tenMinutesAgo }
        }).select('reference status');

        // Check each old pending link with Paystack
        for (const link of oldPendingLinks) {
            try {
                logger.info(`Checking status for old pending link: ${link.reference}`);
                const verification = await verifyPayment(link.reference);

                if (verification.success && verification.data) {
                    const paymentData = verification.data;

                    // Update payment link status based on Paystack response
                    if (paymentData.status === 'success') {
                        await PaymentLink.findOneAndUpdate(
                            { reference: link.reference },
                            {
                                status: 'completed',
                                paidAt: new Date(),
                                verifiedAt: new Date()
                            }
                        );

                        // Create order if payment was successful
                        await createOrderFromPaymentLink(link.reference, paymentData);

                        logger.info(`Updated pending link ${link.reference} to completed`);
                    } else if (paymentData.status === 'failed') {
                        await PaymentLink.findOneAndUpdate(
                            { reference: link.reference },
                            { status: 'failed' }
                        );
                        logger.info(`Updated pending link ${link.reference} to failed`);
                    }
                }
            } catch (error) {
                logger.error(`Error checking status for link ${link.reference}:`, error);
                // Continue with other links even if one fails
            }
        }

        const sortDirection = sortOrder === 'desc' ? -1 : 1;
        const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';

        const paymentLinks = await PaymentLink.find(searchQuery)
            .sort({ [sortField]: sortDirection })
            .skip(skip)
            .limit(limitNum)
            .populate('productId', 'name price image')
            .lean();

        const totalItems = await PaymentLink.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalItems / limitNum);

        // Add computed fields
        const enhancedLinks = paymentLinks.map(link => ({
            ...link,
            isExpired: link.expiresAt ? new Date() > link.expiresAt : false,
            timeRemaining: link.expiresAt ? Math.max(0, link.expiresAt.getTime() - Date.now()) : null,
            timeRemainingFormatted: formatTimeRemaining(link.expiresAt)
        }));

        res.json({
            success: true,
            data: {
                paymentLinks: enhancedLinks,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                }
            }
        });
    } catch (error) {
        logger.error('Error fetching payment links:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment links'
        });
    }
};

// Update payment link status (Admin)
export const updatePaymentLinkStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reference } = req.params;
        const { status } = req.body;

        if (!['pending', 'completed', 'failed', 'expired'].includes(status)) {
            res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: pending, completed, failed, expired'
            });
            return;
        }

        const paymentLink = await PaymentLink.findOne({ reference });

        if (!paymentLink) {
            res.status(404).json({
                success: false,
                error: 'Payment link not found'
            });
            return;
        }

        paymentLink.status = status;
        if (status === 'completed' && !paymentLink.paidAt) {
            paymentLink.paidAt = new Date();
        }

        await paymentLink.save();

        res.json({
            success: true,
            data: paymentLink,
            message: 'Payment link status updated successfully'
        });
    } catch (error) {
        logger.error('Error updating payment link status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update payment link status'
        });
    }
};

// Delete payment link (Admin)
export const deletePaymentLink = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reference } = req.params;

        const paymentLink = await PaymentLink.findOneAndDelete({ reference });

        if (!paymentLink) {
            res.status(404).json({
                success: false,
                error: 'Payment link not found'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Payment link deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting payment link:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete payment link'
        });
    }
};

// Track payment link view (Public)
export const trackPaymentLinkView = async (req: Request, res: Response): Promise<void> => {
    try {
        const { reference } = req.params;
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

        const paymentLink = await PaymentLink.findOne({ reference });

        if (!paymentLink) {
            res.status(404).json({
                success: false,
                error: 'Payment link not found'
            });
            return;
        }

        // Update view tracking
        paymentLink.viewCount += 1;
        paymentLink.lastViewedAt = new Date();

        // Add IP address if not already tracked
        if (!paymentLink.ipAddresses.includes(clientIP)) {
            paymentLink.ipAddresses.push(clientIP);
        }

        await paymentLink.save();

        res.json({
            success: true,
            data: {
                reference: paymentLink.reference,
                viewCount: paymentLink.viewCount,
                isExpired: paymentLink.isExpired,
                timeRemainingFormatted: paymentLink.timeRemainingFormatted
            }
        });
    } catch (error) {
        logger.error('Error tracking payment link view:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track payment link view'
        });
    }
};

// Helper function to format time remaining
const formatTimeRemaining = (expiresAt: Date | null | undefined): string => {
    if (!expiresAt) return 'No expiry';

    const now = new Date();
    const timeRemaining = expiresAt.getTime() - now.getTime();

    if (timeRemaining <= 0) return 'Expired';

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
};

// Helper function to create order from payment link data
const createOrderFromPaymentLink = async (reference: string, paymentData: any): Promise<void> => {
    try {
        const paymentLink = await PaymentLink.findOne({ reference }).populate('productId');
        if (!paymentLink) {
            logger.error(`Payment link not found for reference: ${reference}`);
            return;
        }

        // Check if order already exists
        const existingOrder = await Order.findOne({ paymentReference: reference });
        if (existingOrder) {
            logger.info(`Order already exists for reference: ${reference}`);

            // Just update status if it's not already completed
            if (existingOrder.paymentStatus !== 'paid') {
                const oldPaymentStatus = existingOrder.paymentStatus;
                existingOrder.paymentStatus = 'paid';
                existingOrder.status = 'processing';
                await existingOrder.save();
                logger.info(`Updated existing order status for: ${reference}`);

                // Send payment confirmation email if status changed from pending to paid
                if (oldPaymentStatus === 'pending' && existingOrder.customerEmail) {
                    try {
                        const emailSent = await EmailService.sendOrderStatusUpdate(
                            existingOrder.customerEmail,
                            existingOrder.customerName || 'Valued Customer',
                            existingOrder.orderNumber,
                            'pending_payment',
                            'payment_confirmed'
                        );

                        if (emailSent) {
                            logger.info('Payment confirmation email sent for existing order', {
                                orderNumber: existingOrder.orderNumber,
                                paymentReference: reference
                            });
                        }
                    } catch (emailError) {
                        logger.error('Error sending payment confirmation email for existing order', {
                            orderNumber: existingOrder.orderNumber,
                            error: emailError
                        });
                    }
                }
            }
            return;
        }

        // Generate unique order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Prepare order data
        const orderData = {
            orderNumber,
            orderType: 'payment_link' as const, // Mark as payment link order
            customerEmail: paymentData.customer?.email || paymentLink.customerEmail || '',
            customerName: paymentData.customer?.first_name && paymentData.customer?.last_name
                ? `${paymentData.customer.first_name} ${paymentData.customer.last_name}`.trim()
                : paymentLink.customerName || '',
            customerPhone: paymentLink.customerPhone || '',
            items: [] as any[],
            subtotal: paymentData.amount / 100, // Convert from kobo to naira
            shipping: 0,
            total: paymentData.amount / 100,
            paymentMethod: 'paystack' as const,
            paymentReference: reference,
            paymentStatus: 'paid' as const,
            status: 'processing' as const,
            notes: `Payment Link Order - ${paymentLink.description || 'No description'}`,
            metadata: {
                paymentLinkId: paymentLink._id,
                paystackData: paymentData
            }
        };

        // Handle product-based or custom payment
        if (paymentLink.productId && typeof paymentLink.productId === 'object') {
            // Product-based payment
            const product = paymentLink.productId as any;
            orderData.items = [{
                productId: product._id?.toString() || product.id,
                name: product.name,
                price: paymentLink.amount, // Use payment link amount (might be different from product price)
                quantity: paymentLink.quantity,
                image: product.image
            }];

            // Update product stock
            if (product.quantity !== undefined) {
                await Product.findByIdAndUpdate(
                    product._id || product.id,
                    {
                        $inc: { quantity: -paymentLink.quantity },
                        $set: {
                            inStock: Math.max(0, product.quantity - paymentLink.quantity) > 0,
                            badge: Math.max(0, product.quantity - paymentLink.quantity) <= 0 ? 'SOLD OUT' : product.badge
                        }
                    }
                );
            }
        } else {
            // Custom payment (no specific product) - use placeholder ID
            orderData.items = [{
                productId: 'custom-payment', // Use placeholder instead of null
                name: paymentLink.productName || paymentLink.description || 'Custom Payment',
                price: paymentLink.amount,
                quantity: paymentLink.quantity,
                image: null
            }];
        }

        // Create the order
        const order = new Order(orderData);
        await order.save();

        logger.info(`Successfully created order ${orderNumber} from payment link ${reference}`);

        // Send order confirmation email for payment link orders
        if (order.customerEmail) {
            try {
                const emailSent = await EmailService.sendOrderConfirmation({
                    customerName: order.customerName || 'Valued Customer',
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
                    logger.info('Order confirmation email sent for payment link order', {
                        orderNumber: order.orderNumber,
                        paymentReference: reference
                    });
                } else {
                    logger.warn('Failed to send order confirmation email for payment link order', {
                        orderNumber: order.orderNumber
                    });
                }
            } catch (emailError) {
                logger.error('Error sending order confirmation email for payment link order', {
                    orderNumber: order.orderNumber,
                    error: emailError
                });
                // Don't fail the order creation if email fails
            }
        }

    } catch (error) {
        logger.error(`Error creating order from payment link ${reference}:`, error);
        // Don't throw error to avoid breaking the payment link status update
    }
};