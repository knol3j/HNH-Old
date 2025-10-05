/**
 * SendGrid Email Configuration
 */

const sgMail = require('@sendgrid/mail');

class EmailService {
    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@hashnhedge.com';
        this.adminEmail = process.env.SENDGRID_ADMIN_EMAIL || 'admin@hashnhedge.com';

        if (this.apiKey) {
            sgMail.setApiKey(this.apiKey);
            console.log('✅ SendGrid initialized');
        } else {
            console.warn('⚠️  SendGrid API key not found. Email notifications disabled.');
        }
    }

    /**
     * Send a single email
     */
    async sendEmail({ to, subject, text, html, templateId, dynamicTemplateData }) {
        if (!this.apiKey) {
            console.warn('⚠️  SendGrid not configured, skipping email');
            return null;
        }

        const msg = {
            to,
            from: this.fromEmail,
            subject,
            text,
            html,
            ...(templateId && { templateId, dynamicTemplateData })
        };

        try {
            const response = await sgMail.send(msg);
            console.log(`✅ Email sent to ${to}: ${subject}`);
            return response;
        } catch (error) {
            console.error('❌ SendGrid error:', error);
            if (error.response) {
                console.error(error.response.body);
            }
            throw error;
        }
    }

    /**
     * Send payment notification
     */
    async sendPaymentNotification(workerEmail, paymentData) {
        const { amount, currency, transactionHash } = paymentData;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4CAF50;">💰 Payment Processed!</h2>
                <p>Your payment from HashNHedge Mining Pool has been processed.</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Amount:</strong> ${amount} ${currency}</p>
                    <p><strong>Transaction:</strong> <a href="https://explorer.solana.com/tx/${transactionHash}">${transactionHash}</a></p>
                </div>
                <p>Thank you for mining with HashNHedge!</p>
                <hr>
                <p style="color: #666; font-size: 12px;">This is an automated message from HashNHedge Mining Pool.</p>
            </div>
        `;

        return await this.sendEmail({
            to: workerEmail,
            subject: `Payment Processed: ${amount} ${currency}`,
            html
        });
    }

    /**
     * Send worker registration confirmation
     */
    async sendWorkerRegistration(workerEmail, workerId) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2196F3;">🎉 Welcome to HashNHedge!</h2>
                <p>Your mining worker has been successfully registered.</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Worker ID:</strong> ${workerId}</p>
                    <p><strong>Pool Address:</strong> pool.hashnhedge.com:3333</p>
                </div>
                <p>Start mining and earning rewards!</p>
                <hr>
                <p style="color: #666; font-size: 12px;">This is an automated message from HashNHedge Mining Pool.</p>
            </div>
        `;

        return await this.sendEmail({
            to: workerEmail,
            subject: 'Welcome to HashNHedge Mining Pool',
            html
        });
    }

    /**
     * Send admin alert
     */
    async sendAdminAlert(subject, message) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f44336;">🚨 Admin Alert</h2>
                <p>${message}</p>
                <p style="color: #666; font-size: 12px;">Timestamp: ${new Date().toISOString()}</p>
            </div>
        `;

        return await this.sendEmail({
            to: this.adminEmail,
            subject: `[ALERT] ${subject}`,
            html
        });
    }

    /**
     * Send weekly mining report
     */
    async sendWeeklyReport(workerEmail, reportData) {
        const { workerId, totalShares, validShares, earnings, blocks } = reportData;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4CAF50;">📊 Weekly Mining Report</h2>
                <p>Here's your mining summary for the past week:</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Worker ID:</strong> ${workerId}</p>
                    <p><strong>Total Shares:</strong> ${totalShares}</p>
                    <p><strong>Valid Shares:</strong> ${validShares} (${((validShares/totalShares)*100).toFixed(2)}%)</p>
                    <p><strong>Earnings:</strong> ${earnings} HNH</p>
                    <p><strong>Blocks Found:</strong> ${blocks}</p>
                </div>
                <p>Keep up the great work!</p>
                <hr>
                <p style="color: #666; font-size: 12px;">This is an automated message from HashNHedge Mining Pool.</p>
            </div>
        `;

        return await this.sendEmail({
            to: workerEmail,
            subject: 'Your Weekly Mining Report',
            html
        });
    }
}

module.exports = EmailService;
