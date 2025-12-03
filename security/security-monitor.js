/**
 * HashNHedge Security Monitoring Dashboard
 *
 * Real-time security monitoring and incident response
 * Integrates with backend-security.js and webhook-security.js
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// SECURITY EVENT TYPES
// ============================================================================

const SecurityEventTypes = {
    // Authentication
    AUTH_FAILED: 'auth_failed',
    AUTH_SUCCESS: 'auth_success',
    BRUTE_FORCE: 'brute_force_detected',

    // Authorization
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    FORBIDDEN_ACCESS: 'forbidden_access',
    PRIVILEGE_ESCALATION: 'privilege_escalation_attempt',

    // Injection Attacks
    SQL_INJECTION: 'sql_injection_attempt',
    XSS_ATTEMPT: 'xss_attempt',
    MONGO_INJECTION: 'mongo_injection_attempt',
    PATH_TRAVERSAL: 'path_traversal_attempt',

    // Network
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    IP_BLOCKED: 'ip_blocked',
    SUSPICIOUS_IP: 'suspicious_ip_detected',
    MALICIOUS_USER_AGENT: 'malicious_user_agent',

    // Webhook
    WEBHOOK_AUTH_FAILED: 'webhook_auth_failed',
    WEBHOOK_REPLAY_ATTACK: 'webhook_replay_attack',
    WEBHOOK_INVALID_SIGNATURE: 'webhook_invalid_signature',

    // Data
    DATA_BREACH_ATTEMPT: 'data_breach_attempt',
    DATA_EXFILTRATION: 'data_exfiltration_attempt',
    SENSITIVE_DATA_EXPOSURE: 'sensitive_data_exposure',

    // System
    RESOURCE_EXHAUSTION: 'resource_exhaustion',
    CONFIGURATION_CHANGE: 'configuration_change',
    SYSTEM_INTEGRITY: 'system_integrity_violation'
};

// ============================================================================
// SECURITY SEVERITY LEVELS
// ============================================================================

const SecuritySeverity = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1
};

// Severity mapping for event types
const EVENT_SEVERITY = {
    [SecurityEventTypes.SQL_INJECTION]: SecuritySeverity.CRITICAL,
    [SecurityEventTypes.PATH_TRAVERSAL]: SecuritySeverity.CRITICAL,
    [SecurityEventTypes.PRIVILEGE_ESCALATION]: SecuritySeverity.CRITICAL,
    [SecurityEventTypes.DATA_BREACH_ATTEMPT]: SecuritySeverity.CRITICAL,
    [SecurityEventTypes.DATA_EXFILTRATION]: SecuritySeverity.CRITICAL,

    [SecurityEventTypes.BRUTE_FORCE]: SecuritySeverity.HIGH,
    [SecurityEventTypes.XSS_ATTEMPT]: SecuritySeverity.HIGH,
    [SecurityEventTypes.MONGO_INJECTION]: SecuritySeverity.HIGH,
    [SecurityEventTypes.IP_BLOCKED]: SecuritySeverity.HIGH,
    [SecurityEventTypes.WEBHOOK_REPLAY_ATTACK]: SecuritySeverity.HIGH,

    [SecurityEventTypes.AUTH_FAILED]: SecuritySeverity.MEDIUM,
    [SecurityEventTypes.UNAUTHORIZED_ACCESS]: SecuritySeverity.MEDIUM,
    [SecurityEventTypes.FORBIDDEN_ACCESS]: SecuritySeverity.MEDIUM,
    [SecurityEventTypes.WEBHOOK_AUTH_FAILED]: SecuritySeverity.MEDIUM,
    [SecurityEventTypes.SUSPICIOUS_IP]: SecuritySeverity.MEDIUM,

    [SecurityEventTypes.RATE_LIMIT_EXCEEDED]: SecuritySeverity.LOW,
    [SecurityEventTypes.MALICIOUS_USER_AGENT]: SecuritySeverity.LOW,
    [SecurityEventTypes.WEBHOOK_INVALID_SIGNATURE]: SecuritySeverity.LOW,

    [SecurityEventTypes.AUTH_SUCCESS]: SecuritySeverity.INFO,
    [SecurityEventTypes.CONFIGURATION_CHANGE]: SecuritySeverity.INFO
};

// ============================================================================
// SECURITY MONITOR
// ============================================================================

class SecurityMonitor extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            logDir: config.logDir || './logs/security',
            retentionDays: config.retentionDays || 90,
            alertThresholds: {
                criticalCount: 1,    // Alert immediately on any critical event
                highCount: 5,        // Alert after 5 high severity events in window
                mediumCount: 20,     // Alert after 20 medium severity events
                windowMs: 60000      // 1 minute window
            },
            enableRealTimeAlerts: config.enableRealTimeAlerts !== false,
            enableAnomalyDetection: config.enableAnomalyDetection !== false,
            ...config
        };

        // Event storage
        this.events = [];
        this.maxEvents = 10000;

        // Metrics
        this.metrics = {
            totalEvents: 0,
            eventsBySeverity: {
                [SecuritySeverity.CRITICAL]: 0,
                [SecuritySeverity.HIGH]: 0,
                [SecuritySeverity.MEDIUM]: 0,
                [SecuritySeverity.LOW]: 0,
                [SecuritySeverity.INFO]: 0
            },
            eventsByType: {},
            eventsByIP: {},
            alertsSent: 0
        };

        // Anomaly detection baselines
        this.baselines = {
            avgEventsPerHour: 0,
            avgAuthFailuresPerHour: 0,
            avgRateLimitsPerHour: 0
        };

        // Active incidents
        this.incidents = new Map();
        this.incidentCounter = 0;

        // Initialize
        this.initialize();
    }

    async initialize() {
        // Create log directory
        await fs.mkdir(this.config.logDir, { recursive: true });

        // Start periodic tasks
        this.startPeriodicTasks();

        console.log('🔒 Security Monitor initialized');
    }

    /**
     * Log security event
     */
    async logEvent(type, data = {}) {
        const event = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            type,
            severity: EVENT_SEVERITY[type] || SecuritySeverity.INFO,
            severityName: this.getSeverityName(EVENT_SEVERITY[type] || SecuritySeverity.INFO),
            ...data
        };

        // Store event
        this.events.push(event);
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }

        // Update metrics
        this.updateMetrics(event);

        // Write to log file
        await this.writeToLogFile(event);

        // Check for incident creation/escalation
        await this.checkIncidents(event);

        // Real-time alerting
        if (this.config.enableRealTimeAlerts) {
            await this.checkAlertThresholds(event);
        }

        // Emit event for listeners
        this.emit('security_event', event);

        return event;
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Get severity name from level
     */
    getSeverityName(severity) {
        const names = {
            [SecuritySeverity.CRITICAL]: 'CRITICAL',
            [SecuritySeverity.HIGH]: 'HIGH',
            [SecuritySeverity.MEDIUM]: 'MEDIUM',
            [SecuritySeverity.LOW]: 'LOW',
            [SecuritySeverity.INFO]: 'INFO'
        };
        return names[severity] || 'UNKNOWN';
    }

    /**
     * Update metrics
     */
    updateMetrics(event) {
        this.metrics.totalEvents++;
        this.metrics.eventsBySeverity[event.severity]++;

        this.metrics.eventsByType[event.type] = (this.metrics.eventsByType[event.type] || 0) + 1;

        if (event.ip) {
            this.metrics.eventsByIP[event.ip] = (this.metrics.eventsByIP[event.ip] || 0) + 1;
        }
    }

    /**
     * Write event to log file
     */
    async writeToLogFile(event) {
        const logFile = path.join(
            this.config.logDir,
            `security_${new Date().toISOString().split('T')[0]}.log`
        );

        const logLine = JSON.stringify(event) + '\n';

        await fs.appendFile(logFile, logLine).catch(err => {
            console.error('Failed to write security log:', err);
        });
    }

    /**
     * Check if event should trigger incident
     */
    async checkIncidents(event) {
        // Critical events always create incidents
        if (event.severity === SecuritySeverity.CRITICAL) {
            await this.createIncident(event);
            return;
        }

        // Check for related events that could indicate attack
        const recentRelated = this.getRecentEvents({
            type: event.type,
            ip: event.ip,
            windowMs: 300000 // 5 minutes
        });

        // Multiple similar events from same IP = incident
        if (recentRelated.length >= 5) {
            await this.createIncident(event, {
                relatedEvents: recentRelated,
                reason: 'Multiple security events from same source'
            });
        }
    }

    /**
     * Create security incident
     */
    async createIncident(event, metadata = {}) {
        const incident = {
            id: `inc_${++this.incidentCounter}_${Date.now()}`,
            createdAt: new Date().toISOString(),
            severity: event.severity,
            severityName: event.severityName,
            triggerEvent: event,
            status: 'open',
            metadata,
            updates: []
        };

        this.incidents.set(incident.id, incident);

        // Send immediate alert for incident
        await this.sendAlert({
            type: 'incident_created',
            incident
        });

        this.emit('incident_created', incident);

        console.error(`🚨 SECURITY INCIDENT CREATED: ${incident.id}`);
        console.error(`   Severity: ${incident.severityName}`);
        console.error(`   Trigger: ${event.type}`);
        if (event.ip) {
            console.error(`   Source IP: ${event.ip}`);
        }

        return incident;
    }

    /**
     * Check alert thresholds
     */
    async checkAlertThresholds(event) {
        const windowMs = this.config.alertThresholds.windowMs;

        // Count events by severity in window
        const recentBySeverity = this.getRecentEvents({
            windowMs,
            severity: event.severity
        });

        const count = recentBySeverity.length;
        const threshold = this.getSeverityThreshold(event.severity);

        if (count >= threshold) {
            await this.sendAlert({
                type: 'threshold_exceeded',
                severity: event.severity,
                severityName: event.severityName,
                count,
                threshold,
                windowMs,
                recentEvents: recentBySeverity.slice(0, 10) // Include up to 10 events
            });
        }
    }

    /**
     * Get threshold for severity level
     */
    getSeverityThreshold(severity) {
        const thresholds = this.config.alertThresholds;

        switch (severity) {
            case SecuritySeverity.CRITICAL:
                return thresholds.criticalCount;
            case SecuritySeverity.HIGH:
                return thresholds.highCount;
            case SecuritySeverity.MEDIUM:
                return thresholds.mediumCount;
            default:
                return Infinity; // No alerts for low/info
        }
    }

    /**
     * Get recent events matching criteria
     */
    getRecentEvents(criteria = {}) {
        const { type, ip, severity, windowMs = 60000 } = criteria;
        const cutoff = Date.now() - windowMs;

        return this.events.filter(event => {
            const eventTime = new Date(event.timestamp).getTime();
            if (eventTime < cutoff) return false;

            if (type && event.type !== type) return false;
            if (ip && event.ip !== ip) return false;
            if (severity !== undefined && event.severity !== severity) return false;

            return true;
        });
    }

    /**
     * Send alert
     */
    async sendAlert(alert) {
        this.metrics.alertsSent++;

        // Log alert
        console.error('');
        console.error('═══════════════════════════════════════════════');
        console.error('🚨 SECURITY ALERT');
        console.error('═══════════════════════════════════════════════');
        console.error(JSON.stringify(alert, null, 2));
        console.error('═══════════════════════════════════════════════');
        console.error('');

        // Emit for external handlers
        this.emit('security_alert', alert);

        // TODO: Implement actual alerting mechanisms
        // Examples:
        // - await this.sendEmailAlert(alert);
        // - await this.sendSlackAlert(alert);
        // - await this.sendPagerDutyAlert(alert);
        // - await this.sendWebhook(alert);
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        const now = Date.now();
        const lastHour = now - 3600000;
        const last24Hours = now - 86400000;

        const eventsLastHour = this.events.filter(e =>
            new Date(e.timestamp).getTime() > lastHour
        );
        const eventsLast24Hours = this.events.filter(e =>
            new Date(e.timestamp).getTime() > last24Hours
        );

        return {
            total: this.metrics.totalEvents,
            lastHour: eventsLastHour.length,
            last24Hours: eventsLast24Hours.length,

            bySeverity: this.metrics.eventsBySeverity,

            topEventTypes: Object.entries(this.metrics.eventsByType)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([type, count]) => ({ type, count })),

            topIPs: Object.entries(this.metrics.eventsByIP)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([ip, count]) => ({ ip, count })),

            activeIncidents: Array.from(this.incidents.values())
                .filter(i => i.status === 'open').length,

            alertsSent: this.metrics.alertsSent
        };
    }

    /**
     * Get dashboard summary
     */
    getDashboard() {
        const metrics = this.getMetrics();
        const incidents = Array.from(this.incidents.values())
            .filter(i => i.status === 'open')
            .sort((a, b) => b.severity - a.severity);

        return {
            timestamp: new Date().toISOString(),
            metrics,
            incidents,
            recentEvents: this.events.slice(-50).reverse()
        };
    }

    /**
     * Print dashboard to console
     */
    printDashboard() {
        const dashboard = this.getDashboard();
        const metrics = dashboard.metrics;

        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║           SECURITY MONITORING DASHBOARD                   ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');

        console.log(`📊 Event Summary:`);
        console.log(`   Total Events: ${metrics.total}`);
        console.log(`   Last Hour: ${metrics.lastHour}`);
        console.log(`   Last 24 Hours: ${metrics.last24Hours}`);
        console.log('');

        console.log(`🎯 By Severity:`);
        console.log(`   Critical: ${metrics.bySeverity[SecuritySeverity.CRITICAL]}`);
        console.log(`   High: ${metrics.bySeverity[SecuritySeverity.HIGH]}`);
        console.log(`   Medium: ${metrics.bySeverity[SecuritySeverity.MEDIUM]}`);
        console.log(`   Low: ${metrics.bySeverity[SecuritySeverity.LOW]}`);
        console.log(`   Info: ${metrics.bySeverity[SecuritySeverity.INFO]}`);
        console.log('');

        if (metrics.topEventTypes.length > 0) {
            console.log(`📈 Top Event Types:`);
            metrics.topEventTypes.slice(0, 5).forEach(({ type, count }) => {
                console.log(`   ${type}: ${count}`);
            });
            console.log('');
        }

        if (metrics.topIPs.length > 0) {
            console.log(`🌐 Top Source IPs:`);
            metrics.topIPs.slice(0, 5).forEach(({ ip, count }) => {
                console.log(`   ${ip}: ${count} events`);
            });
            console.log('');
        }

        console.log(`🚨 Active Incidents: ${metrics.activeIncidents}`);
        if (dashboard.incidents.length > 0) {
            dashboard.incidents.forEach(incident => {
                console.log(`   ${incident.id} [${incident.severityName}] - ${incident.triggerEvent.type}`);
            });
        }
        console.log('');

        console.log(`📬 Alerts Sent: ${metrics.alertsSent}`);
        console.log('');
    }

    /**
     * Start periodic tasks
     */
    startPeriodicTasks() {
        // Print dashboard every 5 minutes
        setInterval(() => {
            this.printDashboard();
        }, 300000);

        // Clean old events every hour
        setInterval(() => {
            this.cleanOldEvents();
        }, 3600000);

        // Update baselines every hour
        setInterval(() => {
            this.updateBaselines();
        }, 3600000);
    }

    /**
     * Clean old events from memory
     */
    cleanOldEvents() {
        const cutoff = Date.now() - (24 * 3600000); // 24 hours
        const before = this.events.length;

        this.events = this.events.filter(event =>
            new Date(event.timestamp).getTime() > cutoff
        );

        const removed = before - this.events.length;
        if (removed > 0) {
            console.log(`🧹 Cleaned ${removed} old events from memory`);
        }
    }

    /**
     * Update anomaly detection baselines
     */
    updateBaselines() {
        const last24Hours = Date.now() - 86400000;
        const eventsLast24Hours = this.events.filter(e =>
            new Date(e.timestamp).getTime() > last24Hours
        );

        this.baselines.avgEventsPerHour = eventsLast24Hours.length / 24;

        const authFailures = eventsLast24Hours.filter(e =>
            e.type === SecurityEventTypes.AUTH_FAILED
        );
        this.baselines.avgAuthFailuresPerHour = authFailures.length / 24;

        const rateLimits = eventsLast24Hours.filter(e =>
            e.type === SecurityEventTypes.RATE_LIMIT_EXCEEDED
        );
        this.baselines.avgRateLimitsPerHour = rateLimits.length / 24;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    SecurityMonitor,
    SecurityEventTypes,
    SecuritySeverity
};
