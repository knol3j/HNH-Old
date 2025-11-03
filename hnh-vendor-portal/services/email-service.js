/**
 * HashNHedge Email Service
 * SendGrid integration for vendor notifications
 */

const sgMail = require('@sendgrid/mail');

class EmailService {
    constructor(config = {}) {
        this.config = {
            apiKey: config.apiKey || process.env.SENDGRID_API_KEY,
            fromEmail: config.fromEmail || 'noreply@hashnhedge.com',
            fromName: config.fromName || 'HashNHedge',

            // Admin notification emails
            adminEmails: [
                'knol3j@gmail.com',
                'ugbuni@proton.me',
                'nolij@ik.me'
            ],

            ...config
        };

        if (this.config.apiKey) {
            sgMail.setApiKey(this.config.apiKey);
        }

        // Email templates
        this.templates = {
            vendorRegistrationConfirmation: {
                subject: 'Registration Received - HashNHedge Vendor Portal',
                template: 'vendor_registration_confirmation'
            },
            vendorApproved: {
                subject: 'Welcome to HashNHedge - Vendor Account Approved',
                template: 'vendor_approved'
            },
            vendorRejected: {
                subject: 'HashNHedge Vendor Application Update',
                template: 'vendor_rejected'
            },
            jobCompleted: {
                subject: 'Compute Job Completed - HashNHedge',
                template: 'job_completed'
            },
            jobFailed: {
                subject: 'Compute Job Failed - HashNHedge',
                template: 'job_failed'
            },
            monthlyStatement: {
                subject: 'Monthly Statement - HashNHedge',
                template: 'monthly_statement'
            },
            adminAlert: {
                subject: 'Admin Alert - HashNHedge Vendor Portal',
                template: 'admin_alert'
            }
        };
    }

    /**
     * Send vendor registration confirmation
     */
    async sendVendorRegistrationConfirmation(vendorData) {
        // Escape all user input to prevent XSS
        const safeData = {
            contact_first_name: this.escapeHtml(vendorData.contact_first_name),
            legal_business_name: this.escapeHtml(vendorData.legal_business_name),
            business_type: this.escapeHtml(vendorData.business_type),
            contact_email: this.escapeHtml(vendorData.contact_email)
        };

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Registration Received</h1>
                        <p>HashNHedge Vendor Portal</p>
                    </div>
                    <div class="content">
                        <p>Dear ${safeData.contact_first_name},</p>

                        <p>Thank you for registering <strong>${safeData.legal_business_name}</strong> with HashNHedge's compute vendor program!</p>

                        <div class="info-box">
                            <h3>📋 What Happens Next?</h3>
                            <ol>
                                <li>Our team will review your application within <strong>24-48 hours</strong></li>
                                <li>We'll verify your business information and documentation</li>
                                <li>You'll receive an email notification once your account is approved</li>
                                <li>Upon approval, you'll receive API credentials to start submitting jobs</li>
                            </ol>
                        </div>

                        <div class="info-box">
                            <h3>📝 Application Summary</h3>
                            <ul>
                                <li><strong>Business:</strong> ${safeData.legal_business_name}</li>
                                <li><strong>Type:</strong> ${safeData.business_type}</li>
                                <li><strong>Contact:</strong> ${safeData.contact_email}</li>
                                <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
                            </ul>
                        </div>

                        <p>If you have any questions, please don't hesitate to reach out to us at <a href="mailto:vendors@hashnhedge.com">vendors@hashnhedge.com</a>.</p>

                        <p>Best regards,<br>
                        <strong>HashNHedge Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 HashNHedge. All rights reserved.<br>
                        <a href="https://hashnhedge.com">hashnhedge.com</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendEmail({
            to: vendorData.contact_email,
            subject: this.templates.vendorRegistrationConfirmation.subject,
            html
        });
    }

    /**
     * Send vendor approval notification
     */
    async sendVendorApproved(vendorData, apiKey) {
        // Escape all user input
        const safeData = {
            contact_first_name: this.escapeHtml(vendorData.contact_first_name),
            legal_business_name: this.escapeHtml(vendorData.legal_business_name)
        };
        const safeApiKey = this.escapeHtml(apiKey);
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .info-box { background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; }
                    .api-key-box { background: #f0fdf4; padding: 15px; border: 2px dashed #10b981; border-radius: 5px; font-family: monospace; word-break: break-all; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Welcome to HashNHedge!</h1>
                        <p>Your vendor account has been approved</p>
                    </div>
                    <div class="content">
                        <p>Dear ${safeData.contact_first_name},</p>

                        <p>Great news! Your vendor application for <strong>${safeData.legal_business_name}</strong> has been approved.</p>

                        <div class="info-box">
                            <h3>🔑 Your API Credentials</h3>
                            <p>Use these credentials to submit compute jobs to our network:</p>
                            <div class="api-key-box">
                                <strong>API Key:</strong><br>
                                ${safeApiKey}
                            </div>
                            <p style="color: #dc2626; font-size: 13px;">⚠️ Keep this key secure! Do not share it publicly.</p>
                        </div>

                        <div class="info-box">
                            <h3>🚀 Getting Started</h3>
                            <ol>
                                <li>Review our <a href="https://hashnhedge.com/docs/api">API Documentation</a></li>
                                <li>Submit your first compute job via the API</li>
                                <li>Monitor job status in your <a href="https://hashnhedge.com/hnh-vendor-portal">vendor dashboard</a></li>
                                <li>Track usage and billing in real-time</li>
                            </ol>
                        </div>

                        <div class="info-box">
                            <h3>📊 What You Can Do</h3>
                            <ul>
                                <li>Submit AI/ML inference and training jobs</li>
                                <li>3D rendering and video encoding tasks</li>
                                <li>Scientific simulations and data processing</li>
                                <li>Custom GPU compute workloads</li>
                            </ul>
                        </div>

                        <a href="https://hashnhedge.com/hnh-vendor-portal/marketplace.html" class="button">Access Marketplace →</a>

                        <p>If you have any questions, contact us at <a href="mailto:vendors@hashnhedge.com">vendors@hashnhedge.com</a>.</p>

                        <p>Welcome aboard!<br>
                        <strong>HashNHedge Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 HashNHedge. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendEmail({
            to: vendorData.contact_email,
            subject: this.templates.vendorApproved.subject,
            html
        });
    }

    /**
     * Send vendor rejection notification
     */
    async sendVendorRejected(vendorData, reason) {
        // Escape all user input
        const safeData = {
            contact_first_name: this.escapeHtml(vendorData.contact_first_name),
            legal_business_name: this.escapeHtml(vendorData.legal_business_name)
        };
        const safeReason = this.escapeHtml(reason);
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 15px; border-left: 4px solid #6b7280; margin: 15px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Application Update</h1>
                        <p>HashNHedge Vendor Portal</p>
                    </div>
                    <div class="content">
                        <p>Dear ${safeData.contact_first_name},</p>

                        <p>Thank you for your interest in becoming a HashNHedge compute vendor.</p>

                        <p>After careful review, we're unable to approve your application for <strong>${safeData.legal_business_name}</strong> at this time.</p>

                        ${reason ? `
                        <div class="info-box">
                            <h3>📋 Reason</h3>
                            <p>${safeReason}</p>
                        </div>
                        ` : ''}

                        <div class="info-box">
                            <h3>💡 Next Steps</h3>
                            <p>You're welcome to reapply after addressing the issues mentioned above. If you have questions about your application, please contact us at <a href="mailto:vendors@hashnhedge.com">vendors@hashnhedge.com</a>.</p>
                        </div>

                        <p>Thank you for your understanding.</p>

                        <p>Best regards,<br>
                        <strong>HashNHedge Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 HashNHedge. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendEmail({
            to: vendorData.contact_email,
            subject: this.templates.vendorRejected.subject,
            html
        });
    }

    /**
     * Send admin alert for new vendor registration
     */
    async sendAdminAlert(vendorData) {
        // Escape all user input
        const safeData = {
            legal_business_name: this.escapeHtml(vendorData.legal_business_name),
            business_type: this.escapeHtml(vendorData.business_type),
            contact_first_name: this.escapeHtml(vendorData.contact_first_name),
            contact_last_name: this.escapeHtml(vendorData.contact_last_name),
            contact_email: this.escapeHtml(vendorData.contact_email),
            contact_phone: this.escapeHtml(vendorData.contact_phone || 'N/A'),
            website: this.escapeHtml(vendorData.website || 'N/A'),
            tax_country: this.escapeHtml(vendorData.tax_country || 'N/A'),
            business_description: this.escapeHtml(vendorData.business_description || 'N/A')
        };
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
                    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔔 New Vendor Registration</h1>
                        <p>Action Required</p>
                    </div>
                    <div class="content">
                        <p>A new vendor has registered and is awaiting approval.</p>

                        <div class="info-box">
                            <h3>📋 Vendor Details</h3>
                            <ul>
                                <li><strong>Business:</strong> ${safeData.legal_business_name}</li>
                                <li><strong>Type:</strong> ${safeData.business_type}</li>
                                <li><strong>Contact:</strong> ${safeData.contact_first_name} ${safeData.contact_last_name}</li>
                                <li><strong>Email:</strong> ${safeData.contact_email}</li>
                                <li><strong>Phone:</strong> ${safeData.contact_phone}</li>
                                <li><strong>Website:</strong> ${safeData.website}</li>
                                <li><strong>Tax Country:</strong> ${safeData.tax_country}</li>
                                <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
                            </ul>
                        </div>

                        <div class="info-box">
                            <h3>📝 Business Description</h3>
                            <p>${safeData.business_description}</p>
                        </div>

                        <a href="https://hashnhedge.com/hnh-vendor-portal/vendor-management.html" class="button">Review Application →</a>

                        <p style="color: #dc2626; font-size: 13px;">
                            ⚠️ Please review this application within 24-48 hours
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send to all admin emails
        return Promise.all(this.config.adminEmails.map(email =>
            this.sendEmail({
                to: email,
                subject: `🔔 New Vendor: ${safeData.legal_business_name}`,
                html
            })
        ));
    }

    /**
     * Send generic email
     */
    async sendEmail({ to, cc, subject, html, text, attachments }) {
        const msg = {
            to,
            from: {
                email: this.config.fromEmail,
                name: this.config.fromName
            },
            subject,
            html,
            text: text || this.stripHtml(html)
        };

        if (cc) {
            msg.cc = cc;
        }

        if (attachments) {
            msg.attachments = attachments;
        }

        try {
            const response = await sgMail.send(msg);

            console.log(`✅ Email sent to ${to}: ${subject}`);

            return {
                success: true,
                messageId: response[0].headers['x-message-id'],
                to,
                subject
            };
        } catch (error) {
            console.error(`❌ Email failed to ${to}:`, error.message);

            if (error.response) {
                console.error('SendGrid error:', error.response.body);
            }

            return {
                success: false,
                error: error.message,
                to,
                subject
            };
        }
    }

    /**
     * Escape HTML to prevent XSS in emails
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';

        const htmlEscapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        return text.replace(/[&<>"'/]/g, char => htmlEscapeMap[char]);
    }

    /**
     * Strip HTML tags for plain text version (secure implementation)
     * Removes all tags without decoding entities to prevent double-unescaping
     */
    stripHtml(html) {
        if (typeof html !== 'string') return '';

        // First, completely remove script/style/iframe/object/embed tags and their content
        // Use very permissive regex to match all variations
        let text = html
            .replace(/<(script|style|iframe|object|embed)[^>]*>.*?<\/\1>/gis, ' ')
            // Remove any remaining opening tags of dangerous elements
            .replace(/<(script|style|iframe|object|embed)[^>]*>/gi, ' ');

        // Then remove all other HTML tags
        let previous = '';
        while (text !== previous) {
            previous = text;
            text = text.replace(/<[^>]*>/g, ' ');
        }

        // Only decode safe entities (don't decode < > to prevent injection)
        text = text
            .replace(/&nbsp;/gi, ' ')
            .replace(/&quot;/gi, '"')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();

        // Final safety check - if any HTML-like content remains, reject it
        if (/<|>/.test(text)) {
            return '';
        }

        return text;
    }

    /**
     * Send monthly statement
     */
    async sendMonthlyStatement(vendorData, stats) {
        // TODO: Implement monthly statement email with PDF attachment
    }

    /**
     * Send job completion notification
     */
    async sendJobCompleted(vendorData, jobData) {
        // TODO: Implement job completion email
    }

    /**
     * Send job failure notification
     */
    async sendJobFailed(vendorData, jobData, error) {
        // TODO: Implement job failure email
    }
}

module.exports = EmailService;
