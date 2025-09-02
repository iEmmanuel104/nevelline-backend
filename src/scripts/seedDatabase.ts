import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product';
import Category from '../models/Category';
import Settings from '../models/Settings';

dotenv.config();

const categories = [
    {
        name: "Men's Wear",
        slug: 'mens-wear',
        icon: '👔',
        image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=300',
        order: 1,
        active: true
    },
    {
        name: "Women's Wear",
        slug: 'womens-wear',
        icon: '👗',
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=300',
        order: 2,
        active: true
    },
    {
        name: "Kids Wear",
        slug: 'kids-wear',
        icon: '👶',
        image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&h=300',
        order: 3,
        active: true
    },
    {
        name: "Accessories",
        slug: 'accessories',
        icon: '👜',
        image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&h=300',
        order: 4,
        active: true
    },
    {
        name: "Men's Shoes",
        slug: 'mens-shoes',
        icon: '👟',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300',
        order: 5,
        active: true
    },
    {
        name: "Beautician",
        slug: 'beautician',
        icon: '💄',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300',
        order: 6,
        active: true
    }
];

const products = [
    // Trending Products
    {
        name: 'Vintage Denim Jacket',
        price: 12000,
        originalPrice: 15000,
        category: 'mens-wear',
        image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500',
        badge: 'SALE',
        colors: ['#4169E1', '#000000', '#8B4513'],
        discount: 20,
        inStock: true,
        quantity: 50,
        trending: true,
        active: true,
        description: 'Classic vintage denim jacket with modern styling'
    },
    {
        name: 'Floral Summer Dress',
        price: 8000,
        category: 'womens-wear',
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&h=500',
        badge: 'NEW',
        colors: ['#FFB6C1', '#87CEEB', '#FFFFFF'],
        inStock: true,
        quantity: 30,
        trending: true,
        active: true,
        description: 'Beautiful floral summer dress perfect for any occasion'
    },
    {
        name: 'Kids Rainbow Sweater',
        price: 10500,
        originalPrice: 12000,
        category: 'kids-wear',
        image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&h=500',
        badge: 'HOT',
        discount: 12,
        inStock: true,
        quantity: 25,
        trending: true,
        active: true,
        description: 'Colorful rainbow sweater for kids'
    },
    {
        name: 'Leather Crossbody Bag',
        price: 15000,
        category: 'accessories',
        image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&h=500',
        colors: ['#8B4513', '#000000', '#D2691E'],
        inStock: true,
        quantity: 15,
        trending: true,
        active: true,
        description: 'Premium leather crossbody bag with adjustable strap'
    },

    // Featured Products
    {
        name: 'Classic White Sneakers',
        price: 18000,
        originalPrice: 22000,
        category: 'mens-shoes',
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500',
        badge: 'SALE',
        discount: 18,
        colors: ['#FFFFFF', '#000000', '#FF0000'],
        inStock: true,
        quantity: 40,
        featured: true,
        active: true,
        description: 'Timeless white sneakers that go with everything'
    },
    {
        name: 'Silk Evening Gown',
        price: 25000,
        category: 'womens-wear',
        image: 'https://images.unsplash.com/photo-1566479179817-0ddb5fa87cd9?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1594938384824-58d9b11b7e8c?w=400&h=500',
        badge: 'NEW',
        colors: ['#800080', '#000080', '#C0C0C0'],
        inStock: true,
        quantity: 10,
        featured: true,
        active: true,
        description: 'Elegant silk evening gown for special occasions'
    },
    {
        name: 'Kids School Backpack',
        price: 12000,
        category: 'kids-wear',
        image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a45?w=400&h=500',
        colors: ['#FF69B4', '#87CEEB', '#90EE90'],
        inStock: true,
        quantity: 35,
        featured: true,
        active: true,
        description: 'Durable and fun school backpack for kids'
    },
    {
        name: 'Premium Sunglasses',
        price: 8000,
        originalPrice: 10000,
        category: 'accessories',
        image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=500',
        badge: 'HOT',
        discount: 20,
        inStock: true,
        quantity: 20,
        featured: true,
        active: true,
        description: 'UV protection premium sunglasses'
    },

    // Men's Products
    {
        name: 'Business Formal Suit',
        price: 38000,
        originalPrice: 45000,
        category: 'mens-wear',
        image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&h=500',
        badge: 'SALE',
        discount: 15,
        colors: ['#000000', '#000080', '#696969'],
        inStock: true,
        quantity: 12,
        active: true,
        description: 'Professional business suit for the modern gentleman'
    },
    {
        name: 'Casual Cotton Shirt',
        price: 8500,
        category: 'mens-wear',
        image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1602810318660-d2c46b750f88?w=400&h=500',
        colors: ['#FFFFFF', '#87CEEB', '#E6E6FA'],
        inStock: true,
        quantity: 45,
        active: true,
        description: 'Comfortable cotton shirt for everyday wear'
    },
    {
        name: 'Leather Dress Shoes',
        price: 22000,
        category: 'mens-shoes',
        image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1614252234498-45025e0c0820?w=400&h=500',
        badge: 'NEW',
        colors: ['#000000', '#8B4513'],
        inStock: true,
        quantity: 18,
        active: true,
        description: 'Classic leather dress shoes for formal occasions'
    },
    {
        name: 'Sporty Track Jacket',
        price: 14500,
        originalPrice: 16000,
        category: 'mens-wear',
        image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc31?w=400&h=500',
        discount: 10,
        colors: ['#FF0000', '#0000FF', '#000000'],
        inStock: true,
        quantity: 28,
        active: true,
        description: 'Athletic track jacket for sports and casual wear'
    },

    // Women's Products
    {
        name: 'Elegant Maxi Dress',
        price: 18500,
        originalPrice: 22000,
        category: 'womens-wear',
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1594938384824-58d9b11b7e8c?w=400&h=500',
        badge: 'SALE',
        discount: 15,
        colors: ['#FF69B4', '#FFC0CB', '#E6E6FA'],
        inStock: true,
        quantity: 22,
        active: true,
        description: 'Flowing maxi dress perfect for summer days'
    },
    {
        name: 'Chic Blazer',
        price: 16000,
        category: 'womens-wear',
        image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400&h=500',
        colors: ['#000000', '#FFFFFF', '#FFC0CB'],
        inStock: true,
        quantity: 17,
        active: true,
        description: 'Stylish blazer for professional and casual looks'
    },
    {
        name: 'Designer Handbag',
        price: 28000,
        category: 'accessories',
        image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&h=500',
        badge: 'NEW',
        colors: ['#D2691E', '#000000', '#8B0000'],
        inStock: true,
        quantity: 8,
        active: true,
        description: 'Luxury designer handbag with premium materials'
    },
    {
        name: 'Yoga Leggings',
        price: 9500,
        category: 'womens-wear',
        image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&h=500',
        colors: ['#000000', '#696969', '#FF69B4'],
        inStock: true,
        quantity: 55,
        active: true,
        description: 'High-performance yoga leggings with stretch fabric'
    },

    // Kids Products
    {
        name: 'Superhero T-Shirt',
        price: 8000,
        originalPrice: 9500,
        category: 'kids-wear',
        image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&h=500',
        badge: 'SALE',
        discount: 15,
        colors: ['#FF0000', '#0000FF', '#FFFF00'],
        inStock: true,
        quantity: 40,
        active: true,
        description: 'Fun superhero themed t-shirt for kids'
    },
    {
        name: 'Denim Overalls',
        price: 11500,
        category: 'kids-wear',
        image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=400&h=500',
        colors: ['#4169E1', '#000080'],
        inStock: true,
        quantity: 32,
        active: true,
        description: 'Durable denim overalls for active kids'
    },
    {
        name: 'Princess Costume',
        price: 13000,
        category: 'kids-wear',
        image: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&h=500',
        badge: 'NEW',
        colors: ['#FFB6C1', '#E6E6FA', '#87CEEB'],
        inStock: true,
        quantity: 15,
        active: true,
        description: 'Magical princess costume for dress-up and parties'
    },
    {
        name: 'Light-Up Sneakers',
        price: 10000,
        originalPrice: 12000,
        category: 'kids-wear',
        image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=400&h=500',
        backImage: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=500',
        badge: 'HOT',
        discount: 16,
        colors: ['#FF69B4', '#00CED1', '#9370DB'],
        inStock: true,
        quantity: 28,
        active: true,
        description: 'Cool light-up sneakers that kids love'
    }
];

const defaultSettings = {
    siteName: 'Nevelline',
    siteDescription: 'Your one-stop shop for quality fashion and accessories',
    hero: {
        title: 'New Season Arrivals',
        subtitle: 'Check out all the trends',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&h=600',
        ctaText: 'Shop Now',
        ctaLink: '/collections'
    },
    contact: {
        email: 'support@nevelline.com',
        phone: '+234 800 000 0000',
        whatsapp: '+234 800 000 0000',
        address: 'Lagos, Nigeria'
    },
    social: {
        facebook: 'https://facebook.com/nevelline',
        instagram: 'https://instagram.com/nevelline',
        twitter: 'https://twitter.com/nevelline'
    },
    payment: {
        enablePaystack: true,
        enableBankTransfer: true,
        enableCashOnDelivery: false,
        bankDetails: {
            bankName: 'First Bank of Nigeria',
            accountName: 'Nevelline Fashion',
            accountNumber: '1234567890'
        }
    },
    shipping: {
        freeShippingThreshold: 50000,
        defaultShippingFee: 2000
    },
    currency: {
        code: 'NGN',
        symbol: '₦'
    }
};

async function seedDatabase() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nevelline';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Product.deleteMany({});
        await Category.deleteMany({});
        await Settings.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Seed categories
        const createdCategories = await Category.insertMany(categories);
        console.log(`✅ Seeded ${createdCategories.length} categories`);

        // Update product count for each category
        for (const category of createdCategories) {
            const count = products.filter(p => p.category === category.slug).length;
            await Category.findByIdAndUpdate(category._id, { productCount: count });
        }

        // Seed products
        const createdProducts = await Product.insertMany(products);
        console.log(`✅ Seeded ${createdProducts.length} products`);

        // Seed settings
        await Settings.create(defaultSettings);
        console.log('✅ Seeded site settings');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✨ Database seeding completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📦 Products: ${createdProducts.length}`);
        console.log(`📂 Categories: ${createdCategories.length}`);
        console.log(`⚙️  Settings: Configured`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Run the seed function
seedDatabase();