// backend/src/services/email.service.js
/**
 * Email Service
 * 
 * Sends templated emails using Nodemailer.
 * In development, emails are logged to console instead of being sent.
 * 
 * Features:
 * - Template-based emails
 * - Development mode (console logging)
 * - Production mode (SMTP via Nodemailer)
 */

const nodemailer = require('nodemailer');
const logger = require('./logger.service');

class EmailService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.transporter = this.createTransporter();
    this.fromAddress = process.env.EMAIL_FROM || 'InstaCrave <noreply@instacrave.com>';
  }

  /**
   * Create email transporter
   * In development: logs to console
   * In production: uses SMTP or email service
   */
  createTransporter() {
    if (!this.isProduction || !process.env.SMTP_HOST) {
      // Development mode or no SMTP configured - create test account
      logger.info('Email service running in TEST mode (emails will be logged, not sent)');
      
      // Use Ethereal for testing (free fake SMTP service)
      // Alternatively, just log emails
      return {
        sendMail: async (mailOptions) => {
          logger.debug('Email (TEST MODE)', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            hasHtml: !!mailOptions.html,
            textPreview: mailOptions.text?.substring(0, 100),
          });
          return { messageId: `test-${Date.now()}` };
        }
      };
    }

    // Production mode - real SMTP
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail({ to, userName }) {
    const subject = 'Welcome to InstaCrave! 🎉';
    const text = `
Hi ${userName},

Welcome to InstaCrave!

Thanks for joining the platform. Here's what you can do:

✓ Browse food content from partners
✓ Save and like dishes
✓ Follow food partners
✓ Order food for delivery
✓ Comment and engage with the community

Get started by exploring the feed.

Best regards,
The InstaCrave Team

---
If you have any questions, reply to this email or visit our help center.
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .features { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .feature { margin: 10px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to InstaCrave!</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${userName}</strong>,</p>
      <p>Thanks for joining InstaCrave.</p>
      
      <div class="features">
        <h3>What you can do on InstaCrave:</h3>
        <div class="feature">✓ Browse food content from partners</div>
        <div class="feature">✓ Save and like dishes</div>
        <div class="feature">✓ Follow food partners</div>
        <div class="feature">✓ Order food for delivery</div>
        <div class="feature">✓ Comment and engage with the community</div>
      </div>
      
      <center>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">
          Start Exploring →
        </a>
      </center>
      
      <p>If you have any questions, feel free to reach out.</p>
      
      <p><strong>The InstaCrave Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} InstaCrave. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation({ to, userName, orderDetails }) {
    const { orderId, foodName, quantity, totalPrice, deliveryAddress, foodPartnerName } = orderDetails;
    
    const subject = `Order Confirmation #${orderId} - InstaCrave`;
    const text = `
Hi ${userName},

Your order has been confirmed! 🎉

Order Details:
- Order ID: ${orderId}
- Food: ${foodName} x ${quantity}
- Partner: ${foodPartnerName}
- Total: $${totalPrice.toFixed(2)}
- Delivery Address: ${deliveryAddress}

Your food partner has been notified and will start preparing your order soon.

Track your order status in the app.

Enjoy your meal!

Best regards,
The InstaCrave Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .order-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
    .order-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .total { font-size: 18px; font-weight: bold; color: #10b981; margin-top: 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Order Confirmed!</h1>
      <p>Order #${orderId}</p>
    </div>
    <div class="content">
      <p>Hi <strong>${userName}</strong>,</p>
      <p>Your order has been confirmed.</p>
      
      <div class="order-box">
        <h3>Order Summary</h3>
        <div class="order-item">
          <span>Food Item:</span>
          <span><strong>${foodName}</strong></span>
        </div>
        <div class="order-item">
          <span>Quantity:</span>
          <span>${quantity}</span>
        </div>
        <div class="order-item">
          <span>Food Partner:</span>
          <span>${foodPartnerName}</span>
        </div>
        <div class="order-item">
          <span>Delivery Address:</span>
          <span>${deliveryAddress}</span>
        </div>
        <div class="total">
          Total: $${totalPrice.toFixed(2)}
        </div>
      </div>
      
      <p>Your food partner has been notified and will start preparing your order soon!</p>
      
      <center>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders" class="button">
          Track Order →
        </a>
      </center>
      
      <p>Enjoy your meal! 🍽️</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate({ to, userName, orderId, status, foodName }) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed!',
      preparing: 'Your order is being prepared!',
      ready: 'Your order is ready!',
      delivered: 'Your order has been delivered!',
      cancelled: 'Your order has been cancelled.',
    };

    const subject = `Order #${orderId} - ${statusMessages[status]}`;
    const text = `
Hi ${userName},

${statusMessages[status]}

Order: ${foodName}
Order ID: ${orderId}
Status: ${status.toUpperCase()}

${status === 'delivered' ? 'We hope you enjoyed your meal!' : 'Track your order in the app.'}

Best regards,
The InstaCrave Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .status-${status} { background: ${status === 'delivered' ? '#10b981' : '#3b82f6'}; color: white; padding: 20px; text-align: center; border-radius: 10px; }
    .content { background: #f9f9f9; padding: 30px; margin-top: 20px; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-${status}">
      <h2>${statusMessages[status]}</h2>
      <p>Order #${orderId}</p>
    </div>
    <div class="content">
      <p>Hi <strong>${userName}</strong>,</p>
      <p><strong>${foodName}</strong> - Status: <strong>${status.toUpperCase()}</strong></p>
      ${status === 'delivered' ? '<p>We hope you enjoyed your meal! ❤️</p>' : ''}
    </div>
  </div>
</body>
</html>
    `.trim();

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Generic email sender
   * All specific email methods use this internally
   */
  async sendEmail({ to, subject, text, html }) {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        text,
        html,
      });

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: info.messageId,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
