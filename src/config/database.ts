import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nevelline';

        console.log('🔍 Attempting to connect to MongoDB...');
        console.log('🔑 Using connection string:', mongoURI.replace(/:[^:@]*@/, ':***@')); // Hide password

        // Set connection options with timeout
        const connectionOptions = {
            serverSelectionTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 45000, // 45 seconds
            maxPoolSize: 10,
            minPoolSize: 2,
            connectTimeoutMS: 10000 // 10 seconds
            // Removed deprecated bufferCommands and bufferMaxEntries options
        };

        console.log('⏳ Connection timeout set to 10 seconds...');
        await mongoose.connect(mongoURI, connectionOptions);

        console.log('✅ MongoDB connected successfully');
        console.log('📊 Database:', mongoose.connection.name);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        console.log('⚠️  Running without database - some features will not work');

        // Log more details about the error
        if (error instanceof Error) {
            console.log('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n')[0]
            });
        }

        // Don't exit in development/testing - let the server run without DB
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
});

export default connectDB;