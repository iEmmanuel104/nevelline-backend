import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
    siteName: string;
    siteDescription?: string;
    logo?: string;
    favicon?: string;
    hero: {
        title: string;
        subtitle?: string;
        image: string;
        ctaText: string;
        ctaLink: string;
    };
    contact: {
        email: string;
        phone: string;
        whatsapp: string;
        address?: string;
    };
    social?: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
        linkedin?: string;
    };
    payment: {
        paystackPublicKey?: string;
        enablePaystack: boolean;
        enableBankTransfer: boolean;
        enableCashOnDelivery: boolean;
        bankDetails?: {
            bankName?: string;
            accountName?: string;
            accountNumber?: string;
        };
    };
    shipping: {
        freeShippingThreshold?: number;
        defaultShippingFee: number;
    };
    currency: {
        code: string;
        symbol: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SettingsSchema: Schema = new Schema({
    siteName: {
        type: String,
        required: true,
        default: 'Nevelline'
    },
    siteDescription: String,
    logo: String,
    favicon: String,
    hero: {
        title: {
            type: String,
            default: 'New Season Arrivals'
        },
        subtitle: String,
        image: String,
        ctaText: {
            type: String,
            default: 'Shop Now'
        },
        ctaLink: {
            type: String,
            default: '/collections'
        }
    },
    contact: {
        email: {
            type: String,
            required: true,
            default: 'support@nevelline.com'
        },
        phone: {
            type: String,
            required: true,
            default: '+234 800 000 0000'
        },
        whatsapp: {
            type: String,
            required: true,
            default: '+234 800 000 0000'
        },
        address: String
    },
    social: {
        facebook: String,
        twitter: String,
        instagram: String,
        linkedin: String
    },
    payment: {
        paystackPublicKey: String,
        enablePaystack: {
            type: Boolean,
            default: true
        },
        enableBankTransfer: {
            type: Boolean,
            default: true
        },
        enableCashOnDelivery: {
            type: Boolean,
            default: false
        },
        bankDetails: {
            bankName: String,
            accountName: String,
            accountNumber: String
        }
    },
    shipping: {
        freeShippingThreshold: Number,
        defaultShippingFee: {
            type: Number,
            default: 0
        }
    },
    currency: {
        code: {
            type: String,
            default: 'NGN'
        },
        symbol: {
            type: String,
            default: '₦'
        }
    }
}, {
    timestamps: true
});

export default mongoose.model<ISettings>('Settings', SettingsSchema);