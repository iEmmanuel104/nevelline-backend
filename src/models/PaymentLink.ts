import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentLink extends Document {
  reference: string;
  amount: number;
  productId?: string;
  productName?: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  quantity: number;
  metadata?: any;
  
  // Paystack response data
  authorization_url: string;
  access_code: string;
  checkout_url: string;
  
  // QR code and short URL
  qrCode: string;
  shortUrl: string;
  
  // Status tracking
  status: 'pending' | 'completed' | 'failed' | 'expired';
  paidAt?: Date;
  verifiedAt?: Date;
  
  // Expiry settings
  expiresAt?: Date;
  sessionTimeoutMinutes?: number;
  
  // Tracking
  viewCount: number;
  lastViewedAt?: Date;
  ipAddresses: string[];
  
  // Virtual properties
  isExpired: boolean;
  timeRemaining: number | null;
  timeRemainingFormatted: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const paymentLinkSchema = new Schema<IPaymentLink>({
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  productId: {
    type: String,
    ref: 'Product'
  },
  productName: String,
  description: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  customerName: {
    type: String,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  metadata: Schema.Types.Mixed,
  
  // Paystack response data
  authorization_url: {
    type: String,
    required: true
  },
  access_code: {
    type: String,
    required: true
  },
  checkout_url: {
    type: String,
    required: true
  },
  
  // QR code and short URL
  qrCode: {
    type: String,
    required: true
  },
  shortUrl: {
    type: String,
    required: true
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  paidAt: Date,
  verifiedAt: Date,
  
  // Expiry settings
  expiresAt: Date,
  sessionTimeoutMinutes: {
    type: Number,
    default: 1440 // 24 hours default
  },
  
  // Tracking
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: Date,
  ipAddresses: [{
    type: String
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true
  }
});

// Virtual for checking if expired
paymentLinkSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for time remaining
paymentLinkSchema.virtual('timeRemaining').get(function(this: IPaymentLink) {
  if (!this.expiresAt) return null;
  const now = new Date();
  const expiry = this.expiresAt;
  if (now >= expiry) return 0;
  return expiry.getTime() - now.getTime();
});

// Virtual for formatted time remaining
paymentLinkSchema.virtual('timeRemainingFormatted').get(function(this: IPaymentLink) {
  if (!this.expiresAt) return 'No expiry';
  
  const now = new Date();
  const timeRemaining = this.expiresAt.getTime() - now.getTime();
  
  if (timeRemaining <= 0) return 'Expired';
  
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
});

// Index for efficient querying
paymentLinkSchema.index({ createdAt: -1 });
paymentLinkSchema.index({ status: 1, createdAt: -1 });
paymentLinkSchema.index({ customerEmail: 1, createdAt: -1 });
paymentLinkSchema.index({ expiresAt: 1 });

// Pre-save middleware to set expiry time
paymentLinkSchema.pre('save', function(next) {
  if (this.isNew && this.sessionTimeoutMinutes && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + this.sessionTimeoutMinutes * 60 * 1000);
  }
  next();
});

export default mongoose.model<IPaymentLink>('PaymentLink', paymentLinkSchema);