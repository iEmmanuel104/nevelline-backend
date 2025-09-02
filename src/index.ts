import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import expressWinston from 'express-winston';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import connectDB from './config/database';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import orderRoutes from './routes/orders';
import settingsRoutes from './routes/settings';
// import uploadRoutes from './routes/uploads'; // Removed - using frontend Cloudinary widget
import paymentRoutes from './routes/payments';
import customerRoutes from './routes/customers';
import dashboardRoutes from './routes/dashboard';
import { logger } from './utils/logger';

// Load environment variables first
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize server with proper startup sequence
async function startServer() {
    try {
        // Step 1: Connect to database first
        console.log('📡 Connecting to MongoDB...');
        await connectDB();

        // Step 2: Setup middleware in proper order

        // Security middleware (should be first)
        app.use(helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
        }));

        // CORS configuration (early in chain)
        app.use(cors({
            origin: [
                process.env.FRONTEND_URL || 'http://localhost:3000',
                process.env.ADMIN_URL || 'http://localhost:3001',
                'https://nevelline.vercel.app'
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // Request logging (before body parsing to log raw requests)
        app.use(morgan('dev'));

        // Body parsing middleware
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Data sanitization against NoSQL query injection
        app.use(mongoSanitize());

        // Session configuration (after body parsing)
        app.use(session({
            secret: process.env.SESSION_SECRET || 'nevelline-secret-key-change-in-production',
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/nevelline',
                touchAfter: 24 * 3600 * 30 // Update session every 30 days
            }),
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year for persistent login
            }
        }));

        // Winston logger for structured logging
        app.use(
            expressWinston.logger({
                winstonInstance: logger,
                statusLevels: true,
            }),
        );
        expressWinston.requestWhitelist.push('body');
        expressWinston.responseWhitelist.push('body');

        // Custom request logger middleware
        app.use((req: Request, res: Response, next: NextFunction) => {
            logger.info(
                `Incoming request: ${req.method} ${req.path} from ${req.ip}`,
                {
                    originalUrl: req.originalUrl,
                    timestamp: new Date().toISOString(),
                    body: req.body,
                    query: req.query,
                    params: req.params
                }
            );
            next();
        });

        // Step 3: Mount API routes
        app.use('/api/auth', authRoutes);
        app.use('/api/products', productRoutes);
        app.use('/api/categories', categoryRoutes);
        app.use('/api/orders', orderRoutes);
        app.use('/api/settings', settingsRoutes);
        // app.use('/api/uploads', uploadRoutes); // Removed - using frontend Cloudinary widget
        app.use('/api/payments', paymentRoutes);
        app.use('/api/customers', customerRoutes);
        app.use('/api/dashboard', dashboardRoutes);

        // Health check endpoint
        app.get('/api/health', async (req, res) => {
            const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
            res.json({
                status: 'healthy',
                message: 'Nevelline API is running!',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                database: dbStatus
            });
        });

        // 404 handler (should be second to last)
        app.use('*', (req, res) => {
            logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
            res.status(404).json({ error: 'Route not found' });
        });

        // Global error handler (should be last)
        app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            logger.error('Unhandled error:', err);

            const statusCode = err.statusCode || 500;
            const message = err.message || 'Something went wrong!';

            res.status(statusCode).json({
                error: message,
                ...(process.env.NODE_ENV === 'development' && {
                    details: err.message,
                    stack: err.stack
                })
            });
        });

        // Step 4: Start the server only after everything is initialized
        app.listen(PORT, () => {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✅ All services initialized successfully!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
            console.log(`💾 Database: Connected to MongoDB`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Import mongoose for health check
import mongoose from 'mongoose';

// Start the server
startServer();