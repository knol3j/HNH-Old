#!/usr/bin/env node

/**
 * HashNHedge Security Monitoring Starter
 *
 * Starts the security monitoring system with alerting configured
 */

const { SecurityMonitor, SecurityEventTypes } = require('./security/security-monitor');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
    logDir: './logs/security',
    retentionDays: 90,
    enableRealTimeAlerts: true,
    enableAnomalyDetection: true,

    alertThresholds: {
        criticalCount: 1,    // Alert immediately on any critical event
        highCount: 5,        // Alert after 5 high severity events in 1 minute
        mediumCount: 20,     // Alert after 20 medium severity events in 1 minute
        windowMs: 60000      // 1 minute window
    }
};

// ============================================================================
// ALERTING CONFIGURATION
// ============================================================================

// Email alerting (requires nodemailer)
const emailConfig = {
    enabled: false,  // Set to true to enable email alerts
    from: 'security@hashnhedge.com',
    to: 'admin@hashnhedge.com',
    smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    }
};

// Slack alerting
const slackConfig = {
    enabled: false,  // Set to true to enable Slack alerts
    webhookUrl: process.env.SLACK_WEBHOOK_URL
};

// Discord alerting
const discordConfig = {
    enabled: false,  // Set to true to enable Discord alerts
    webhookUrl: process.env.DISCORD_WEBHOOK_URL
};

// ============================================================================
// INITIALIZE MONITOR
// ============================================================================

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  HashNHedge Security Monitoring System                       ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

const monitor = new SecurityMonitor(config);

// ============================================================================
// SETUP ALERTING
// ============================================================================

// Handle security alerts
monitor.on('security_alert', async (alert) => {
    console.error('');
    console.error('🚨 SECURITY ALERT RECEIVED');
    console.error('Type:', alert.type);
    console.error('Severity:', alert.severityName || alert.severity);
    console.error('');

    // Send email alert
    if (emailConfig.enabled) {
        await sendEmailAlert(alert);
    }

    // Send Slack alert
    if (slackConfig.enabled) {
        await sendSlackAlert(alert);
    }

    // Send Discord alert
    if (discordConfig.enabled) {
        await sendDiscordAlert(alert);
    }
});

// Handle incident creation
monitor.on('incident_created', async (incident) => {
    console.error('');
    console.error('🚨 SECURITY INCIDENT CREATED');
    console.error('ID:', incident.id);
    console.error('Severity:', incident.severityName);
    console.error('Trigger:', incident.triggerEvent.type);
    console.error('');

    // Send high-priority notifications
    if (emailConfig.enabled) {
        await sendEmailIncident(incident);
    }

    if (slackConfig.enabled) {
        await sendSlackIncident(incident);
    }

    if (discordConfig.enabled) {
        await sendDiscordIncident(incident);
    }
});

// ============================================================================
// ALERTING FUNCTIONS
// ============================================================================

async function sendEmailAlert(alert) {
    try {
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport(emailConfig.smtp);

        const subject = `🚨 Security Alert: ${alert.type}`;
        const html = `
            <h2>Security Alert</h2>
            <p><strong>Type:</strong> ${alert.type}</p>
            <p><strong>Severity:</strong> ${alert.severityName || alert.severity}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <hr>
            <pre>${JSON.stringify(alert, null, 2)}</pre>
        `;

        await transporter.sendMail({
            from: emailConfig.from,
            to: emailConfig.to,
            subject,
            html
        });

        console.log('✅ Email alert sent');
    } catch (error) {
        console.error('Failed to send email alert:', error.message);
    }
}

async function sendSlackAlert(alert) {
    try {
        const https = require('https');
        const url = new URL(slackConfig.webhookUrl);

        const payload = JSON.stringify({
            text: `🚨 Security Alert: ${alert.type}`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '🚨 Security Alert'
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Type:*\n${alert.type}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Severity:*\n${alert.severityName || alert.severity}`
                        }
                    ]
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `\`\`\`${JSON.stringify(alert, null, 2)}\`\`\``
                    }
                }
            ]
        });

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Slack alert sent');
            }
        });

        req.on('error', (error) => {
            console.error('Failed to send Slack alert:', error.message);
        });

        req.write(payload);
        req.end();
    } catch (error) {
        console.error('Failed to send Slack alert:', error.message);
    }
}

async function sendDiscordAlert(alert) {
    try {
        const https = require('https');
        const url = new URL(discordConfig.webhookUrl);

        const payload = JSON.stringify({
            content: `🚨 **Security Alert**: ${alert.type}`,
            embeds: [
                {
                    title: 'Security Alert Details',
                    color: 15158332, // Red color
                    fields: [
                        {
                            name: 'Type',
                            value: alert.type,
                            inline: true
                        },
                        {
                            name: 'Severity',
                            value: alert.severityName || alert.severity,
                            inline: true
                        },
                        {
                            name: 'Time',
                            value: new Date().toISOString(),
                            inline: true
                        }
                    ],
                    description: `\`\`\`json\n${JSON.stringify(alert, null, 2).substring(0, 1000)}\n\`\`\``
                }
            ]
        });

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 204) {
                console.log('✅ Discord alert sent');
            }
        });

        req.on('error', (error) => {
            console.error('Failed to send Discord alert:', error.message);
        });

        req.write(payload);
        req.end();
    } catch (error) {
        console.error('Failed to send Discord alert:', error.message);
    }
}

async function sendEmailIncident(incident) {
    // Similar to sendEmailAlert but with incident-specific formatting
    await sendEmailAlert({ ...incident, type: `INCIDENT: ${incident.id}` });
}

async function sendSlackIncident(incident) {
    // Similar to sendSlackAlert but with incident-specific formatting
    await sendSlackAlert({ ...incident, type: `INCIDENT: ${incident.id}` });
}

async function sendDiscordIncident(incident) {
    // Similar to sendDiscordAlert but with incident-specific formatting
    await sendDiscordAlert({ ...incident, type: `INCIDENT: ${incident.id}` });
}

// ============================================================================
// DEMONSTRATION MODE
// ============================================================================

async function runDemo() {
    console.log('🎮 Running demonstration mode...');
    console.log('   This will simulate various security events');
    console.log('');

    // Simulate some security events
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Simulating authentication failure...');
    await monitor.logEvent(SecurityEventTypes.AUTH_FAILED, {
        ip: '192.168.1.100',
        username: 'admin',
        reason: 'Invalid password'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Simulating SQL injection attempt...');
    await monitor.logEvent(SecurityEventTypes.SQL_INJECTION, {
        ip: '192.168.1.100',
        endpoint: '/api/users',
        payload: "'; DROP TABLE users; --"
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Simulating successful authentication...');
    await monitor.logEvent(SecurityEventTypes.AUTH_SUCCESS, {
        ip: '192.168.1.200',
        username: 'user123'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Simulating rate limit exceeded...');
    for (let i = 0; i < 3; i++) {
        await monitor.logEvent(SecurityEventTypes.RATE_LIMIT_EXCEEDED, {
            ip: '192.168.1.100',
            endpoint: '/api/jobs'
        });
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Print dashboard
    monitor.printDashboard();
}

// ============================================================================
// STARTUP
// ============================================================================

console.log('✅ Security monitor initialized');
console.log('');
console.log('Configuration:');
console.log('  • Log directory:', config.logDir);
console.log('  • Retention:', config.retentionDays, 'days');
console.log('  • Real-time alerts:', config.enableRealTimeAlerts ? 'Enabled' : 'Disabled');
console.log('  • Anomaly detection:', config.enableAnomalyDetection ? 'Enabled' : 'Disabled');
console.log('');
console.log('Alerting:');
console.log('  • Email alerts:', emailConfig.enabled ? '✅ Enabled' : '❌ Disabled');
console.log('  • Slack alerts:', slackConfig.enabled ? '✅ Enabled' : '❌ Disabled');
console.log('  • Discord alerts:', discordConfig.enabled ? '✅ Enabled' : '❌ Disabled');
console.log('');

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--demo')) {
    runDemo().catch(console.error);
} else {
    console.log('📊 Monitoring started');
    console.log('   Dashboard updates every 5 minutes');
    console.log('   Press Ctrl+C to stop');
    console.log('');
    console.log('💡 Tip: Run with --demo flag to see example events');
    console.log('   node start-monitoring.js --demo');
    console.log('');

    // Print initial dashboard
    setTimeout(() => {
        monitor.printDashboard();
    }, 1000);

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('');
        console.log('Stopping security monitor...');
        monitor.printDashboard();
        process.exit(0);
    });
}

// Export for use in other modules
module.exports = monitor;

// ============================================================================
// INTEGRATION EXAMPLE
// ============================================================================

/*
// In your Express application:

const monitor = require('./start-monitoring');

// Log authentication failures
app.post('/login', async (req, res) => {
    try {
        const user = await authenticate(req.body.username, req.body.password);

        // Log successful authentication
        await monitor.logEvent(SecurityEventTypes.AUTH_SUCCESS, {
            ip: req.ip,
            username: req.body.username,
            userId: user.id
        });

        res.json({ success: true, token: user.token });
    } catch (error) {
        // Log failed authentication
        await monitor.logEvent(SecurityEventTypes.AUTH_FAILED, {
            ip: req.ip,
            username: req.body.username,
            reason: error.message
        });

        res.status(401).json({ error: 'Authentication failed' });
    }
});

// Log suspicious activity
app.use((req, res, next) => {
    // Detect SQL injection attempts
    const suspicious = ['DROP', 'DELETE', 'INSERT', 'UPDATE', '--', ';'].some(keyword =>
        JSON.stringify(req.query).toUpperCase().includes(keyword) ||
        JSON.stringify(req.body).toUpperCase().includes(keyword)
    );

    if (suspicious) {
        monitor.logEvent(SecurityEventTypes.SQL_INJECTION, {
            ip: req.ip,
            endpoint: req.path,
            method: req.method,
            query: req.query,
            body: req.body
        });
    }

    next();
});
*/
