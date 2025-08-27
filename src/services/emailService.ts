import { Resend } from 'resend';
import { logger } from '../utils/logger';

let resendInstance: Resend | null = null;

function getResendInstance(): Resend {
    if (!resendInstance) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error('RESEND_API_KEY environment variable is required');
        }
        resendInstance = new Resend(apiKey);
    }
    return resendInstance;
}

export interface OrderConfirmationEmailData {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        image?: string;
    }>;
    subtotal: number;
    shipping: number;
    total: number;
    orderDate: string;
    paymentMethod: string;
    paymentReference?: string;
}

export class EmailService {
    private static FROM_EMAIL = 'orders@nevellines.com'; // Replace with your verified domain
    private static COMPANY_NAME = 'Nevellines';
    private static COMPANY_ADDRESS = 'Lagos, Nigeria';
    private static SUPPORT_EMAIL = 'support@nevellines.com';
    private static WEBSITE_URL = 'https://nevellines.com';

    static async sendOrderConfirmation(data: OrderConfirmationEmailData): Promise<boolean> {
        try {
            const emailHtml = this.generateOrderConfirmationHTML(data);

            const result = await getResendInstance().emails.send({
                from: this.FROM_EMAIL,
                to: [data.customerEmail],
                subject: `Order Confirmation - ${data.orderNumber}`,
                html: emailHtml,
            });

            logger.info('Order confirmation email sent successfully', {
                orderId: data.orderNumber,
                customerEmail: data.customerEmail,
                messageId: result.data?.id
            });

            return true;
        } catch (error) {
            logger.error('Failed to send order confirmation email', {
                orderId: data.orderNumber,
                customerEmail: data.customerEmail,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }

    private static generateOrderConfirmationHTML(data: OrderConfirmationEmailData): string {
        const itemsHtml = data.items.map(item => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; display: flex; align-items: center;">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 12px;">` : ''}
          <div>
            <div style="font-weight: 600; color: #111827;">${item.name}</div>
            <div style="font-size: 14px; color: #6b7280;">Quantity: ${item.quantity}</div>
          </div>
        </td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600;">
          ₦${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `).join('');

        return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${this.COMPANY_NAME}</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your order!</p>
        </div>

        <!-- Order Confirmation -->
        <div style="padding: 30px;">
          <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <div style="width: 24px; height: 24px; background-color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="color: white; font-size: 16px;">✓</span>
              </div>
              <h2 style="margin: 0; color: #065f46; font-size: 20px;">Order Confirmed</h2>
            </div>
            <p style="margin: 0; color: #047857; font-size: 16px;">
              Hi <strong>${data.customerName}</strong>, your order has been successfully placed and is being processed.
            </p>
          </div>

          <!-- Order Details -->
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
            <div style="background-color: #f9fafb; padding: 20px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 18px;">Order Details</h3>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Order Number</p>
                  <p style="margin: 0; font-weight: 600; color: #111827; font-size: 16px;">${data.orderNumber}</p>
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Order Date</p>
                  <p style="margin: 0; font-weight: 600; color: #111827; font-size: 16px;">${new Date(data.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>

            <!-- Order Items -->
            <div style="padding: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #e5e7eb;">
                    <th style="text-align: left; padding: 12px 0; color: #374151; font-weight: 600;">Item</th>
                    <th style="text-align: right; padding: 12px 0; color: #374151; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <!-- Order Summary -->
            <div style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Subtotal:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">₦${data.subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Shipping:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">₦${data.shipping.toLocaleString()}</td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 12px 0; font-size: 18px; font-weight: 700; color: #111827;">Total:</td>
                  <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: 700; color: #059669;">₦${data.total.toLocaleString()}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Payment Information -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">Payment Information</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #374151;">Payment Method:</span>
              <span style="font-weight: 600; color: #111827; text-transform: capitalize;">${data.paymentMethod}</span>
            </div>
            ${data.paymentReference ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #374151;">Reference:</span>
              <span style="font-family: monospace; font-size: 14px; background-color: #e0e7ff; padding: 4px 8px; border-radius: 4px;">${data.paymentReference}</span>
            </div>
            ` : ''}
          </div>

          <!-- Next Steps -->
          <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 15px 0; color: #a16207; font-size: 16px;">What happens next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li style="margin-bottom: 8px;">We're processing your order and will send you updates via email</li>
              <li style="margin-bottom: 8px;">You'll receive a shipping notification once your items are dispatched</li>
              <li style="margin-bottom: 8px;">Questions? Contact our support team anytime</li>
            </ul>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #111827; color: #e5e7eb; padding: 30px; text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 20px; color: #ffffff;">${this.COMPANY_NAME}</h3>
          <p style="margin: 0 0 15px 0; font-size: 14px;">${this.COMPANY_ADDRESS}</p>
          <div style="margin: 20px 0;">
            <a href="mailto:${this.SUPPORT_EMAIL}" style="color: #60a5fa; text-decoration: none; margin: 0 15px;">Support</a>
            <a href="${this.WEBSITE_URL}" style="color: #60a5fa; text-decoration: none; margin: 0 15px;">Visit Store</a>
          </div>
          <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af;">
            This email was sent regarding your order ${data.orderNumber}. If you have any questions, please contact us.
          </p>
        </div>

      </div>
    </body>
    </html>
    `;
    }

    static async sendOrderStatusUpdate(
        customerEmail: string,
        customerName: string,
        orderNumber: string,
        oldStatus: string,
        newStatus: string
    ): Promise<boolean> {
        try {
            const statusMessages = {
                processing: 'Your order is now being prepared and will be shipped soon.',
                shipped: 'Great news! Your order has been shipped and is on its way to you.',
                delivered: 'Your order has been successfully delivered. Thank you for shopping with us!',
                cancelled: 'Your order has been cancelled. If you have any questions, please contact our support team.',
                payment_confirmed: '🎉 Payment confirmed! Your order is now being processed and will be prepared for shipment.'
            };

            const statusColors = {
                processing: '#f59e0b',
                shipped: '#3b82f6',
                delivered: '#10b981',
                cancelled: '#ef4444',
                payment_confirmed: '#10b981'
            };

            const message = statusMessages[newStatus as keyof typeof statusMessages] ||
                `Your order status has been updated to: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`;

            const color = statusColors[newStatus as keyof typeof statusColors] || '#6b7280';

            const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Update</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${this.COMPANY_NAME}</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Order Status Update</p>
          </div>

          <!-- Status Update -->
          <div style="padding: 30px;">
            <div style="background-color: #f9fafb; border-left: 4px solid ${color}; padding: 20px; margin-bottom: 30px;">
              <h2 style="margin: 0 0 10px 0; color: #111827; font-size: 20px;">Hello ${customerName},</h2>
              <p style="margin: 0 0 10px 0; color: #374151; font-size: 16px; line-height: 1.5;">${message}</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Order #${orderNumber}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.WEBSITE_URL}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order Status</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #111827; color: #e5e7eb; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 14px;">${this.COMPANY_NAME} | ${this.COMPANY_ADDRESS}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
              Questions? Contact us at <a href="mailto:${this.SUPPORT_EMAIL}" style="color: #60a5fa;">${this.SUPPORT_EMAIL}</a>
            </p>
          </div>

        </div>
      </body>
      </html>
      `;

            const result = await getResendInstance().emails.send({
                from: this.FROM_EMAIL,
                to: [customerEmail],
                subject: `Order Update - ${orderNumber}`,
                html: emailHtml,
            });

            logger.info('Order status update email sent successfully', {
                orderId: orderNumber,
                customerEmail,
                oldStatus,
                newStatus,
                messageId: result.data?.id
            });

            return true;
        } catch (error) {
            logger.error('Failed to send order status update email', {
                orderId: orderNumber,
                customerEmail,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
}