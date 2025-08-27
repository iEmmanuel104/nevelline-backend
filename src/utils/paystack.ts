import axios, { AxiosResponse } from 'axios';
import { logger } from './logger';

// Paystack API configuration
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Create axios instance factory function to ensure environment variables are loaded
const createPaystackAPI = () => {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    // Debug: Log the secret key format for troubleshooting
    if (!PAYSTACK_SECRET_KEY) {
        logger.error('PAYSTACK_SECRET_KEY is not set in environment variables');
        throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
    }

    logger.info('Creating Paystack API client:', {
        keyLength: PAYSTACK_SECRET_KEY.length,
        keyPrefix: PAYSTACK_SECRET_KEY.substring(0, 8),
        keySuffix: PAYSTACK_SECRET_KEY.substring(PAYSTACK_SECRET_KEY.length - 5)
    });

    return axios.create({
        baseURL: PAYSTACK_BASE_URL,
        headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
    });
};

export interface PaymentLinkData {
    productId?: string;
    productName?: string;
    customAmount?: number;
    description: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    quantity?: number;
    metadata?: any;
}

export interface PaymentLinkResponse {
    success: boolean;
    data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
        checkout_url: string;
    };
    error?: string;
}

// Create payment link/transaction
export const createPaymentLink = async (linkData: PaymentLinkData): Promise<PaymentLinkResponse> => {
    try {
        const {
            productId,
            productName,
            customAmount,
            description,
            customerEmail,
            customerName,
            customerPhone,
            quantity = 1,
            metadata = {}
        } = linkData;

        logger.info('Payment link creation started with data:', {
            productId,
            productName,
            customAmount,
            description,
            customerEmail: customerEmail ? `${customerEmail.substring(0, 3)}***` : 'none',
            customerName,
            quantity,
            hasMetadata: !!Object.keys(metadata).length
        });

        // Validate required parameters according to Paystack API
        if (!customAmount || customAmount <= 0) {
            logger.error('Invalid amount provided:', customAmount);
            return {
                success: false,
                error: 'Amount must be greater than zero'
            };
        }

        // Validate minimum amount (NGN 1.00 = 100 kobo)
        if (customAmount < 1) {
            logger.error('Amount below minimum threshold:', customAmount);
            return {
                success: false,
                error: 'Minimum amount is NGN 1.00'
            };
        }

        // Convert amount to kobo (Paystack expects amounts in the smallest currency unit)
        const amountInKobo = Math.round(customAmount * 100);
        logger.info('Amount converted to kobo:', { original: customAmount, kobo: amountInKobo });

        // Validate email format if provided
        const emailToUse = customerEmail || 'customer@nevellines.com';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailToUse)) {
            logger.error('Invalid email format:', emailToUse);
            return {
                success: false,
                error: 'Invalid email format'
            };
        }

        // Generate unique reference with proper format (only alphanumeric, -, ., = allowed)
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9).toUpperCase();
        const reference = `PAY-${timestamp}-${randomId}`;
        logger.info('Generated transaction reference:', reference);

        // Validate callback URL
        const callbackUrl = `${process.env.FRONTEND_URL}/payment/callback`;
        if (!process.env.FRONTEND_URL) {
            logger.error('FRONTEND_URL environment variable not set');
            return {
                success: false,
                error: 'Server configuration error'
            };
        }
        logger.info('Using callback URL:', callbackUrl);

        // Build transaction data according to Paystack API specification
        const transactionData: any = {
            email: emailToUse,
            amount: amountInKobo,
            reference,
            currency: 'NGN',
            callback_url: callbackUrl,
            channels: ['card', 'bank', 'ussd', 'qr', 'bank_transfer'], // Specify allowed payment channels
            metadata: {
                productId,
                productName,
                quantity,
                description,
                custom_fields: [
                    {
                        display_name: 'Product Name',
                        variable_name: 'product_name',
                        value: productName || description
                    },
                    {
                        display_name: 'Quantity',
                        variable_name: 'quantity',
                        value: quantity.toString()
                    }
                ],
                ...metadata
            }
        };

        // Add customer info if provided
        if (customerName || customerPhone) {
            transactionData.metadata.custom_fields.push({
                display_name: 'Customer Name',
                variable_name: 'customer_name',
                value: customerName || 'N/A'
            });

            if (customerPhone) {
                transactionData.metadata.custom_fields.push({
                    display_name: 'Phone',
                    variable_name: 'phone',
                    value: customerPhone
                });
            }
        }

        logger.info('Final transaction data prepared:', {
            email: `${emailToUse.substring(0, 3)}***`,
            amount: amountInKobo,
            reference,
            currency: 'NGN',
            callback_url: callbackUrl,
            channels: transactionData.channels,
            metadata_keys: Object.keys(transactionData.metadata),
            custom_fields_count: transactionData.metadata.custom_fields.length
        });

        // Validate Paystack secret key
        if (!process.env.PAYSTACK_SECRET_KEY) {
            logger.error('PAYSTACK_SECRET_KEY environment variable not set');
            return {
                success: false,
                error: 'Payment service configuration error'
            };
        }

        logger.info('Initializing Paystack transaction...');
        const startTime = Date.now();

        const paystackAPI = createPaystackAPI();
        const response: AxiosResponse = await paystackAPI.post('/transaction/initialize', transactionData);

        const endTime = Date.now();
        const duration = endTime - startTime;
        logger.info(`Paystack API call completed in ${duration}ms`);

        // Log the full response for debugging
        logger.info('Paystack API response:', {
            status: response.status,
            statusText: response.statusText,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : []
        });

        // Check if the response was successful and contains data
        if (response.status === 200 && response.data.status) {
            logger.info('Payment link created successfully:', {
                reference: response.data.data.reference,
                access_code: response.data.data.access_code,
                has_authorization_url: !!response.data.data.authorization_url
            });

            return {
                success: true,
                data: {
                    authorization_url: response.data.data.authorization_url,
                    access_code: response.data.data.access_code,
                    reference: response.data.data.reference,
                    checkout_url: response.data.data.authorization_url
                }
            };
        } else {
            logger.error('Paystack transaction initialization failed:', {
                status: response.status,
                statusText: response.statusText,
                message: response.data?.message,
                response: response.data
            });

            return {
                success: false,
                error: response.data?.message || 'Failed to create payment link'
            };
        }
    } catch (error: any) {
        logger.error('Paystack payment link creation error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : 'No response object'
        });

        // Provide more specific error messages based on common Paystack errors
        let errorMessage = 'Failed to create payment link';

        if (error.response) {
            const { status, data } = error.response;

            if (status === 400) {
                errorMessage = data?.message || 'Invalid request parameters';
            } else if (status === 401) {
                errorMessage = 'Invalid API key or unauthorized access';
            } else if (status === 403) {
                errorMessage = 'Access forbidden - check your API permissions';
            } else if (status === 500) {
                errorMessage = 'Paystack server error - please try again later';
            } else {
                errorMessage = data?.message || `API error: ${status}`;
            }
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to Paystack API';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Paystack API endpoint not found';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Request to Paystack API timed out';
        }

        return {
            success: false,
            error: errorMessage
        };
    }
};

// Verify payment transaction
export const verifyPayment = async (reference: string) => {
    try {
        logger.info('Payment verification started for reference:', reference);

        // Validate reference format
        if (!reference || typeof reference !== 'string') {
            logger.error('Invalid reference provided:', reference);
            return {
                success: false,
                error: 'Invalid transaction reference'
            };
        }

        // Validate Paystack secret key
        if (!process.env.PAYSTACK_SECRET_KEY) {
            logger.error('PAYSTACK_SECRET_KEY environment variable not set');
            return {
                success: false,
                error: 'Payment service configuration error'
            };
        }

        logger.info('Calling Paystack verification API...');
        const startTime = Date.now();

        const paystackAPI = createPaystackAPI();
        const response: AxiosResponse = await paystackAPI.get(`/transaction/verify/${reference}`);

        const endTime = Date.now();
        const duration = endTime - startTime;
        logger.info(`Paystack verification API call completed in ${duration}ms`);

        // Log the verification response
        logger.info('Paystack verification response:', {
            status: response.status,
            statusText: response.statusText,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : []
        });

        if (response.status === 200 && response.data.status) {
            logger.info('Payment verification successful:', {
                reference: response.data.data.reference,
                amount_kobo: response.data.data.amount,
                amount_naira: response.data.data.amount / 100,
                status: response.data.data.status,
                gateway_response: response.data.data.gateway_response,
                paid_at: response.data.data.paid_at,
                customer_email: response.data.data.customer?.email
            });

            return {
                success: true,
                data: {
                    reference: response.data.data.reference,
                    amount: response.data.data.amount / 100, // Convert from kobo to naira
                    status: response.data.data.status,
                    gateway_response: response.data.data.gateway_response,
                    paid_at: response.data.data.paid_at,
                    customer: response.data.data.customer,
                    metadata: response.data.data.metadata
                }
            };
        } else {
            logger.error('Payment verification failed:', {
                status: response.status,
                statusText: response.statusText,
                message: response.data?.message,
                reference
            });

            return {
                success: false,
                error: response.data?.message || 'Payment verification failed'
            };
        }
    } catch (error: any) {
        logger.error('Paystack payment verification error:', {
            reference,
            message: error.message,
            stack: error.stack,
            code: error.code,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : 'No response object'
        });

        // Provide more specific error messages
        let errorMessage = 'Failed to verify payment';

        if (error.response) {
            const { status, data } = error.response;

            if (status === 400) {
                errorMessage = data?.message || 'Invalid transaction reference';
            } else if (status === 401) {
                errorMessage = 'Invalid API key or unauthorized access';
            } else if (status === 404) {
                errorMessage = 'Transaction not found';
            } else if (status === 500) {
                errorMessage = 'Paystack server error - please try again later';
            } else {
                errorMessage = data?.message || `API error: ${status}`;
            }
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to Paystack API';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Paystack API endpoint not found';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Request to Paystack API timed out';
        }

        return {
            success: false,
            error: errorMessage
        };
    }
};

// Generate QR code URL for payment link (legacy function for compatibility)
export const generateQRCode = (paymentUrl: string): string => {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/`;
    const params = new URLSearchParams({
        size: '300x300',
        format: 'png',
        data: paymentUrl,
        color: '2563eb', // Nevellines brand blue
        bgcolor: 'ffffff',
        margin: '15',
        ecc: 'M'
    });

    return `${qrApiUrl}?${params.toString()}`;
};

// Create short URL (using a simple shortener service or custom logic)
export const createShortUrl = async (originalUrl: string): Promise<string> => {
    try {
        // For now, return the original URL
        // In production, you might want to use a URL shortening service
        // or create your own shortening logic
        return originalUrl;
    } catch (error) {
        logger.error('URL shortening error:', error);
        return originalUrl;
    }
};

// Get transaction details
export const getTransaction = async (transactionId: string) => {
    try {
        const paystackAPI = createPaystackAPI();
        const response: AxiosResponse = await paystackAPI.get(`/transaction/${transactionId}`);

        if (response.status === 200 && response.data.status) {
            return {
                success: true,
                data: response.data.data
            };
        } else {
            return {
                success: false,
                error: response.data?.message || 'Transaction not found'
            };
        }
    } catch (error: any) {
        logger.error('Get transaction error:', error);

        // Handle axios errors
        if (error.response) {
            return {
                success: false,
                error: error.response.data?.message || 'Failed to get transaction details'
            };
        }

        return {
            success: false,
            error: error.message || 'Failed to get transaction details'
        };
    }
};

// List transactions (for admin)
export const listTransactions = async (params: {
    perPage?: number;
    page?: number;
    status?: string;
    from?: string;
    to?: string;
} = {}) => {
    try {
        // Build query parameters
        const queryParams = new URLSearchParams();
        if (params.perPage) queryParams.append('perPage', params.perPage.toString());
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.status) queryParams.append('status', params.status);
        if (params.from) queryParams.append('from', params.from);
        if (params.to) queryParams.append('to', params.to);

        const queryString = queryParams.toString();
        const url = queryString ? `/transaction?${queryString}` : '/transaction';

        const paystackAPI = createPaystackAPI();
        const response: AxiosResponse = await paystackAPI.get(url);

        if (response.status === 200 && response.data.status) {
            return {
                success: true,
                data: response.data.data,
                meta: response.data.meta
            };
        } else {
            return {
                success: false,
                error: response.data?.message || 'Failed to list transactions'
            };
        }
    } catch (error: any) {
        logger.error('List transactions error:', error);

        // Handle axios errors
        if (error.response) {
            return {
                success: false,
                error: error.response.data?.message || 'Failed to list transactions'
            };
        }

        return {
            success: false,
            error: error.message || 'Failed to list transactions'
        };
    }
};

export default createPaystackAPI;