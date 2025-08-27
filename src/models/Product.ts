import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  image: string;
  backImage?: string;
  gallery?: string[];
  inStock: boolean;
  quantity: number;
  badge?: 'NEW' | 'SALE' | 'HOT' | 'SOLD OUT';
  discount?: number;
  colors?: string[];
  sizes?: string[];
  description?: string;
  active: boolean;
  featured?: boolean;
  trending?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  category: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  backImage: {
    type: String
  },
  gallery: [{
    type: String
  }],
  inStock: {
    type: Boolean,
    default: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  badge: {
    type: String,
    enum: ['NEW', 'SALE', 'HOT', 'SOLD OUT']
  },
  discount: {
    type: Number,
    min: 0,
    max: 100
  },
  colors: [String],
  sizes: [String],
  description: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  trending: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

ProductSchema.index({ category: 1, active: 1 });
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ featured: 1, active: 1 });
ProductSchema.index({ trending: 1, active: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);