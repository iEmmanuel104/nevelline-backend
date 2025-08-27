import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import PaymentLink from '../models/PaymentLink';
import Order from '../models/Order';
import Product from '../models/Product';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nevellines';

async function migratePaymentLinkOrders() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        logger.info('Connected to MongoDB for migration');

        // Find all completed payment links that don't have corresponding orders
        const completedLinks = await PaymentLink.find({
            status: 'completed'
        }).populate('productId');

        logger.info(`Found ${completedLinks.length} completed payment links`);

        let ordersCreated = 0;
        let ordersSkipped = 0;
        let errors = 0;

        for (const link of completedLinks) {
            try {
                // Check if order already exists
                const existingOrder = await Order.findOne({
                    paymentReference: link.reference
                });

                if (existingOrder) {
                    logger.info(`Order already exists for reference: ${link.reference}`);
                    ordersSkipped++;
                    continue;
                }

                // Generate unique order number
                const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

                // Prepare order data
                const orderData: any = {
                    orderNumber,
                    orderType: 'payment_link',
                    customerEmail: link.customerEmail || 'unknown@email.com',
                    customerName: link.customerName || 'Unknown Customer',
                    customerPhone: link.customerPhone || '',
                    items: [],
                    subtotal: link.amount,
                    shipping: 0,
                    total: link.amount,
                    paymentMethod: 'paystack',
                    paymentReference: link.reference,
                    paymentStatus: 'paid',
                    status: 'completed', // Mark as completed since these are old orders
                    notes: `Migrated Payment Link Order - ${link.description || 'No description'}`,
                    createdAt: link.paidAt || link.verifiedAt || link.createdAt,
                    updatedAt: link.updatedAt
                };

                // Handle product-based or custom payment
                if (link.productId && typeof link.productId === 'object') {
                    const product = link.productId as any;
                    orderData.items = [{
                        productId: product._id?.toString() || product.id,
                        name: product.name,
                        price: link.amount,
                        quantity: link.quantity,
                        image: product.image
                    }];
                } else {
                    // Custom payment (no specific product) - use a placeholder ID
                    orderData.items = [{
                        productId: 'custom-payment', // Use placeholder instead of null
                        name: link.productName || link.description || 'Custom Payment',
                        price: link.amount,
                        quantity: link.quantity,
                        image: null
                    }];
                }

                // Create the order
                const order = new Order(orderData);
                await order.save();

                logger.info(`Created order ${orderNumber} for payment link ${link.reference}`);
                ordersCreated++;

            } catch (error) {
                logger.error(`Error creating order for link ${link.reference}:`, error);
                errors++;
            }
        }

        logger.info(`
Migration completed:
- Orders created: ${ordersCreated}
- Orders skipped (already exist): ${ordersSkipped}
- Errors: ${errors}
- Total processed: ${completedLinks.length}
    `);

        // Disconnect from MongoDB
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');

        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the migration
migratePaymentLinkOrders();