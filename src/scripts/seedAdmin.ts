import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin';

dotenv.config();

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nevelline');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@nevelline.com' });

        if (existingAdmin) {
            console.log('Admin already exists');
            process.exit(0);
        }

        // Create default admin
        const admin = new Admin({
            email: 'admin@nevelline.com',
            password: 'admin123', // Will be hashed automatically
            name: 'Admin User'
        });

        await admin.save();

        console.log('✅ Admin created successfully:');
        console.log('Email: admin@nevelline.com');
        console.log('Password: admin123');
        console.log('\n⚠️  Please change the password after first login!');

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedAdmin();