# Nevellines E-commerce API Documentation

## Overview
This is a comprehensive e-commerce API built with Node.js, Express, TypeScript, and MongoDB. It supports product management, order processing, payment integration with Paystack, image uploads with Cloudinary, and admin dashboard functionality.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most admin endpoints require authentication. Include the session cookie or Authorization header.

## API Endpoints

### 1. Authentication Routes (`/api/auth`)

#### POST `/api/auth/login`
Admin login
```json
{
  "email": "admin@nevellines.com",
  "password": "your-password"
}
```

#### POST `/api/auth/logout`
Admin logout (requires auth)

#### GET `/api/auth/me`
Get current admin info (requires auth)

---

### 2. Product Routes (`/api/products`)

#### GET `/api/products`
Get all products with filters
```
Query Parameters:
- category: string (filter by category slug)
- search: string (search in name/description)
- minPrice: number
- maxPrice: number
- badge: string (NEW, SALE, HOT, SOLD OUT)
- inStock: boolean
- featured: boolean
- trending: boolean
- page: number (default: 1)
- limit: number (default: 12)
- sort: string (default: -createdAt)
```

#### GET `/api/products/featured`
Get featured products

#### GET `/api/products/trending`
Get trending products

#### GET `/api/products/category/:category`
Get products by category
```
Query Parameters:
- page: number
- limit: number
```

#### GET `/api/products/:id`
Get single product by ID

#### POST `/api/products` (Admin only)
Create new product
```json
{
  "name": "Product Name",
  "price": 15000,
  "originalPrice": 20000,
  "category": "mens-wear",
  "image": "https://cloudinary-url",
  "backImage": "https://cloudinary-url",
  "description": "Product description",
  "colors": ["#FF0000", "#0000FF"],
  "sizes": ["S", "M", "L"],
  "quantity": 50,
  "badge": "NEW",
  "featured": true,
  "trending": false
}
```

#### PUT `/api/products/:id` (Admin only)
Update product

#### DELETE `/api/products/:id` (Admin only)
Delete product

#### POST `/api/products/bulk-update` (Admin only)
Bulk update products
```json
{
  "productIds": ["id1", "id2"],
  "updateData": {
    "badge": "SALE",
    "discount": 20
  }
}
```

#### PATCH `/api/products/:id/stock` (Admin only)
Update product stock
```json
{
  "quantity": 10,
  "operation": "set" // set, increment, decrement
}
```

#### GET `/api/products/admin/stats` (Admin only)
Get product statistics

---

### 3. Category Routes (`/api/categories`)

#### GET `/api/categories`
Get all categories
```
Query Parameters:
- active: boolean (default: true)
```

#### GET `/api/categories/:slug`
Get category by slug

#### POST `/api/categories` (Admin only)
Create new category
```json
{
  "name": "Men's Wear",
  "slug": "mens-wear",
  "description": "Clothing for men",
  "image": "https://cloudinary-url",
  "icon": "👔"
}
```

#### PUT `/api/categories/:id` (Admin only)
Update category

#### DELETE `/api/categories/:id` (Admin only)
Delete category

#### PATCH `/api/categories/reorder` (Admin only)
Reorder categories
```json
{
  "categoryOrder": [
    {"id": "cat1", "order": 0},
    {"id": "cat2", "order": 1}
  ]
}
```

#### PATCH `/api/categories/update-counts` (Admin only)
Update product counts for all categories

---

### 4. Order Routes (`/api/orders`)

#### POST `/api/orders`
Create new order
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+2348012345678",
  "customerAddress": "Lagos, Nigeria",
  "items": [
    {
      "productId": "product-id",
      "quantity": 2,
      "color": "Red",
      "size": "M"
    }
  ],
  "paymentMethod": "paystack",
  "notes": "Special delivery instructions"
}
```

#### GET `/api/orders` (Admin only)
Get all orders with filters
```
Query Parameters:
- status: string (pending, processing, completed, cancelled)
- paymentStatus: string (pending, paid, failed)
- search: string
- page: number
- limit: number
- startDate: string (ISO date)
- endDate: string (ISO date)
- sort: string
```

#### GET `/api/orders/order/:id`
Get order by ID or order number (public)

#### GET `/api/orders/customer/:email`
Get customer orders by email

#### PATCH `/api/orders/:id/status` (Admin only)
Update order status
```json
{
  "status": "processing",
  "paymentStatus": "paid",
  "notes": "Order confirmed"
}
```

#### PATCH `/api/orders/cancel/:id`
Cancel order (restores stock)

#### GET `/api/orders/admin/stats` (Admin only)
Get order statistics

---

### 5. Settings Routes (`/api/settings`)

#### GET `/api/settings`
Get all site settings

#### GET `/api/settings/:section`
Get specific setting section (hero, contact, payment, etc.)

#### PUT `/api/settings` (Admin only)
Update all settings
```json
{
  "siteName": "Nevellines",
  "hero": {
    "title": "New Season Arrivals",
    "subtitle": "Check out all the trends",
    "image": "https://cloudinary-url",
    "ctaText": "Shop Now"
  },
  "contact": {
    "email": "support@nevellines.com",
    "phone": "+234 800 000 0000",
    "whatsapp": "+234 800 000 0000"
  }
}
```

#### PUT `/api/settings/:section` (Admin only)
Update specific setting section

---

### 6. Upload Routes (`/api/uploads`)

#### GET `/api/uploads/config` (Admin only)
Get Cloudinary widget configuration
```
Query Parameters:
- type: string (products, categories, banners, general)
```

#### POST `/api/uploads/save-url` (Admin only)
Save uploaded image URL (called after Cloudinary upload)
```json
{
  "url": "https://cloudinary-url",
  "public_id": "image-public-id",
  "width": 400,
  "height": 500,
  "format": "jpg"
}
```

#### DELETE `/api/uploads/image` (Admin only)
Delete image from Cloudinary
```json
{
  "public_id": "image-public-id"
}
```

---

### 7. Payment Routes (`/api/payments`)

#### POST `/api/payments/generate-link` (Admin only)
Generate Paystack payment link
```json
{
  "productId": "optional-product-id",
  "customAmount": 15000,
  "description": "Payment for items",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "customerPhone": "+2348012345678",
  "quantity": 1
}
```

#### GET `/api/payments/verify/:reference`
Verify payment transaction

#### POST `/api/payments/webhook/paystack`
Paystack webhook handler

#### GET `/api/payments/transaction/:transactionId` (Admin only)
Get transaction details

#### GET `/api/payments/transactions` (Admin only)
List transactions
```
Query Parameters:
- page: number
- perPage: number
- status: string
- from: string (date)
- to: string (date)
```

---

### 8. Dashboard Routes (`/api/dashboard`)

#### GET `/api/dashboard/stats` (Admin only)
Get dashboard overview statistics
```json
{
  "success": true,
  "data": {
    "products": {
      "total": 120,
      "active": 115,
      "outOfStock": 5,
      "lowStock": 10
    },
    "orders": {
      "total": 450,
      "pending": 12,
      "completed": 380,
      "monthly": 45,
      "daily": 3
    },
    "revenue": {
      "total": 2500000,
      "monthly": 350000,
      "weekly": 75000,
      "daily": 15000
    }
  }
}
```

#### GET `/api/dashboard/activity` (Admin only)
Get recent activity
```
Query Parameters:
- limit: number (default: 10)
```

#### GET `/api/dashboard/sales-analytics` (Admin only)
Get sales analytics
```
Query Parameters:
- period: string (7d, 30d, 90d, 1y)
```

#### GET `/api/dashboard/customer-analytics` (Admin only)
Get customer analytics

#### GET `/api/dashboard/inventory-alerts` (Admin only)
Get inventory alerts

---

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Success Responses

All endpoints return consistent success responses:
```json
{
  "success": true,
  "data": {},
  "message": "Optional success message"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Database Seeding

Run these commands to seed the database:

```bash
# Seed categories and products
npm run seed

# Seed admin user
npm run seed:admin
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `MONGODB_URI` - MongoDB connection string
- `CLOUDINARY_*` - Cloudinary configuration
- `PAYSTACK_*` - Paystack API keys
- `SESSION_SECRET` - Session encryption key
- `FRONTEND_URL` - Frontend application URL
- Other configuration as needed

## Frontend Integration

### Cloudinary Upload Widget

```javascript
// Get widget configuration
const configResponse = await fetch('/api/uploads/config?type=products');
const { config } = await configResponse.json();

// Initialize widget
const widget = cloudinary.createUploadWidget(config, (error, result) => {
  if (result?.event === "success") {
    // Save the URL to your database
    const { secure_url, public_id } = result.info;
    // Use these in your product creation/update
  }
});
```

### Payment Link Generation

```javascript
// Generate payment link
const linkData = {
  productId: 'product-id',
  customerEmail: 'customer@example.com',
  quantity: 1
};

const response = await fetch('/api/payments/generate-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(linkData)
});

const { data } = await response.json();
// Use data.paymentUrl, data.qrCode, data.shortUrl
```

## Testing

The API includes comprehensive error handling, logging, and validation. Test all endpoints thoroughly before production deployment.

## Security

- All admin endpoints require authentication
- Input validation and sanitization
- CORS configuration
- Session security
- Password hashing
- Rate limiting recommended for production