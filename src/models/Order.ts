import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  color?: string;
  size?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  orderType: 'store' | 'payment_link'; // New field to distinguish order source
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  items: IOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentMethod: 'paystack' | 'bank_transfer' | 'cash_on_delivery';
  paymentReference?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema({
  orderNumber: {
    type: String,
    required: true
  },
  orderType: {
    type: String,
    enum: ['store', 'payment_link'],
    default: 'store',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerAddress: String,
  items: [{
    productId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    image: String,
    color: String,
    size: String
  }],
  subtotal: {
    type: Number,
    required: true
  },
  shipping: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['paystack', 'bank_transfer', 'cash_on_delivery'],
    required: true
  },
  paymentReference: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  notes: String
}, {
  timestamps: true
});

OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ customerEmail: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });

OrderSchema.pre<IOrder>('save', function(next) {
  if (!this.orderNumber || this.orderNumber === '') {
    // Generate a unique order number using timestamp and random string
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${randomSuffix}`;
  }
  
  // Ensure orderNumber is always present
  if (!this.orderNumber) {
    return next(new Error('Order number generation failed'));
  }
  
  next();
});

export default mongoose.model<IOrder>('Order', OrderSchema);