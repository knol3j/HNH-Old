/**
 * HashNHedge Frontend Security Module
 *
 * Comprehensive security configuration for React/Next.js/frontend applications
 * Implements CSP, XSS protection, secure cookies, and input validation
 */

// ============================================================================
// CONTENT SECURITY POLICY (CSP)
// ============================================================================

/**
 * Strict Content Security Policy configuration
 * Prevents XSS, clickjacking, and other injection attacks
 */
const CSP_POLICY = {
    // Default: only allow resources from same origin
    'default-src': ["'self'"],

    // Scripts: only from same origin and specific CDNs (add your CDNs here)
    'script-src': [
        "'self'",
        // "'unsafe-inline'", // ⚠️ AVOID if possible - use nonces instead
        // "'unsafe-eval'",   // ⚠️ NEVER use in production
        // Add trusted CDNs:
        // 'https://cdn.jsdelivr.net',
        // 'https://unpkg.com'
    ],

    // Styles: same origin + inline styles (for CSS-in-JS)
    'style-src': [
        "'self'",
        "'unsafe-inline'" // Required for CSS-in-JS libraries like styled-components
    ],

    // Images: same origin + data URLs + specific image hosts
    'img-src': [
        "'self'",
        'data:',
        'blob:',
        // Add image CDNs:
        // 'https://images.your-cdn.com'
    ],

    // Fonts: same origin + font CDNs
    'font-src': [
        "'self'",
        'data:',
        // 'https://fonts.gstatic.com'
    ],

    // AJAX/WebSocket: only same origin
    'connect-src': [
        "'self'",
        'ws://localhost:*', // WebSocket for development
        'wss://*',          // Secure WebSocket for production
        // Add your API endpoints:
        // 'https://api.hashnhedge.com'
    ],

    // Media: same origin
    'media-src': ["'self'"],

    // Objects: block all (prevents Flash, Java, etc.)
    'object-src': ["'none'"],

    // Frames: only same origin
    'frame-src': ["'self'"],

    // Web workers: same origin
    'worker-src': ["'self'", 'blob:'],

    // Form submissions: only to same origin
    'form-action': ["'self'"],

    // Frame ancestors: prevent clickjacking
    'frame-ancestors': ["'none'"],

    // Base URI: prevent base tag injection
    'base-uri': ["'self'"],

    // Block mixed content
    'upgrade-insecure-requests': [],

    // Report violations (optional - set up reporting endpoint)
    // 'report-uri': ['/api/csp-report'],
    // 'report-to': ['csp-endpoint']
};

/**
 * Generate CSP header string
 */
function generateCSPHeader() {
    return Object.entries(CSP_POLICY)
        .map(([directive, sources]) => {
            if (sources.length === 0) {
                return directive;
            }
            return `${directive} ${sources.join(' ')}`;
        })
        .join('; ');
}

// ============================================================================
// SECURITY HEADERS MIDDLEWARE (for Express/NestJS)
// ============================================================================

function securityHeadersMiddleware(req, res, next) {
    // Content Security Policy
    res.setHeader('Content-Security-Policy', generateCSPHeader());

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // HSTS (force HTTPS)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }

    // Referrer Policy (don't leak URLs)
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (restrict browser features)
    res.setHeader('Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
    );

    next();
}

// ============================================================================
// SECURE COOKIE CONFIGURATION
// ============================================================================

const COOKIE_OPTIONS = {
    // Production settings
    production: {
        httpOnly: true,      // Prevent JavaScript access
        secure: true,        // HTTPS only
        sameSite: 'strict',  // CSRF protection
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        domain: undefined    // Set to your domain in production
    },

    // Development settings
    development: {
        httpOnly: true,
        secure: false,       // Allow HTTP in development
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
    }
};

/**
 * Get cookie options based on environment
 */
function getCookieOptions(overrides = {}) {
    const env = process.env.NODE_ENV || 'development';
    const baseOptions = COOKIE_OPTIONS[env] || COOKIE_OPTIONS.development;

    return {
        ...baseOptions,
        ...overrides
    };
}

// ============================================================================
// INPUT VALIDATION & SANITIZATION (Client-side)
// ============================================================================

class FrontendInputValidator {
    /**
     * Sanitize HTML to prevent XSS
     */
    static sanitizeHTML(input) {
        if (typeof input !== 'string') return input;

        // Basic HTML entity encoding
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Sanitize URL to prevent javascript: and data: protocols
     */
    static sanitizeURL(url) {
        if (typeof url !== 'string') return '';

        const trimmed = url.trim().toLowerCase();

        // Block dangerous protocols
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
        for (const protocol of dangerousProtocols) {
            if (trimmed.startsWith(protocol)) {
                console.warn('Blocked dangerous URL protocol:', protocol);
                return '';
            }
        }

        // Only allow http, https, mailto
        if (!trimmed.match(/^(https?:|mailto:|\/)/)) {
            console.warn('Invalid URL protocol:', url);
            return '';
        }

        return url;
    }

    /**
     * Validate email format
     */
    static validateEmail(email) {
        if (typeof email !== 'string') return false;

        // RFC 5322 compliant regex (simplified)
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        return emailRegex.test(email) && email.length <= 254;
    }

    /**
     * Validate password strength
     */
    static validatePassword(password) {
        if (typeof password !== 'string') {
            return { valid: false, errors: ['Password must be a string'] };
        }

        const errors = [];

        // Minimum length
        if (password.length < 12) {
            errors.push('Password must be at least 12 characters');
        }

        // Maximum length (prevent DoS)
        if (password.length > 128) {
            errors.push('Password must be less than 128 characters');
        }

        // Complexity requirements
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain lowercase letters');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain uppercase letters');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain numbers');
        }
        if (!/[^a-zA-Z0-9]/.test(password)) {
            errors.push('Password must contain special characters');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitize user input for display
     */
    static sanitizeUserInput(input, options = {}) {
        if (typeof input !== 'string') return input;

        const {
            maxLength = 10000,
            allowHTML = false,
            allowURLs = true
        } = options;

        // Truncate to max length
        let sanitized = input.substring(0, maxLength);

        // Remove control characters (except newlines/tabs)
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Sanitize HTML unless explicitly allowed
        if (!allowHTML) {
            sanitized = this.sanitizeHTML(sanitized);
        }

        return sanitized;
    }

    /**
     * Validate file upload
     */
    static validateFileUpload(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024,  // 5MB default
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
            allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
        } = options;

        const errors = [];

        // Check file exists
        if (!file) {
            errors.push('No file provided');
            return { valid: false, errors };
        }

        // Check file size
        if (file.size > maxSize) {
            errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
        }

        // Check MIME type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            errors.push(`File type ${file.type} not allowed`);
        }

        // Check file extension
        if (allowedExtensions.length > 0) {
            const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (!allowedExtensions.includes(extension)) {
                errors.push(`File extension ${extension} not allowed`);
            }
        }

        // Check filename for path traversal
        if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
            errors.push('Invalid filename');
        }

        return {
            valid: errors.length === 0,
            errors,
            sanitizedFilename: file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        };
    }
}

// ============================================================================
// REACT SECURITY HOOKS
// ============================================================================

/**
 * Custom React hook for secure form handling
 * Usage: const { value, setValue, error } = useSecureInput('text')
 */
function useSecureInput(type = 'text', options = {}) {
    const [value, setValueRaw] = React.useState('');
    const [error, setError] = React.useState(null);

    const setValue = (newValue) => {
        // Sanitize based on type
        let sanitized = newValue;
        let validationError = null;

        switch (type) {
            case 'email':
                if (newValue && !FrontendInputValidator.validateEmail(newValue)) {
                    validationError = 'Invalid email address';
                }
                break;

            case 'password':
                if (newValue && options.validateStrength) {
                    const result = FrontendInputValidator.validatePassword(newValue);
                    if (!result.valid) {
                        validationError = result.errors[0];
                    }
                }
                break;

            case 'url':
                sanitized = FrontendInputValidator.sanitizeURL(newValue);
                break;

            case 'text':
            default:
                sanitized = FrontendInputValidator.sanitizeUserInput(newValue, options);
                break;
        }

        setValueRaw(sanitized);
        setError(validationError);
    };

    return { value, setValue, error };
}

/**
 * Custom React hook for CSRF token
 * Usage: const csrfToken = useCSRFToken()
 */
function useCSRFToken() {
    const [token, setToken] = React.useState(null);

    React.useEffect(() => {
        // Fetch CSRF token from backend
        fetch('/api/csrf-token', {
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => setToken(data.csrfToken))
            .catch(err => console.error('Failed to fetch CSRF token:', err));
    }, []);

    return token;
}

// ============================================================================
// SECURE API CLIENT (for frontend)
// ============================================================================

class SecureAPIClient {
    constructor(config = {}) {
        this.baseURL = config.baseURL || '/api';
        this.timeout = config.timeout || 30000;
        this.csrfToken = null;
    }

    /**
     * Initialize CSRF token
     */
    async init() {
        try {
            const response = await fetch(`${this.baseURL}/csrf-token`, {
                credentials: 'include'
            });
            const data = await response.json();
            this.csrfToken = data.csrfToken;
        } catch (error) {
            console.error('Failed to initialize CSRF token:', error);
        }
    }

    /**
     * Make secure API request
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            body = null,
            headers = {},
            requireAuth = true
        } = options;

        // Build headers
        const requestHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };

        // Add CSRF token for state-changing operations
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            if (!this.csrfToken) {
                await this.init();
            }
            requestHeaders['X-CSRF-Token'] = this.csrfToken;
        }

        // Build request
        const requestOptions = {
            method,
            headers: requestHeaders,
            credentials: 'include', // Include cookies
            mode: 'cors'
        };

        if (body) {
            requestOptions.body = JSON.stringify(body);
        }

        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        requestOptions.signal = controller.signal;

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, requestOptions);
            clearTimeout(timeoutId);

            // Handle errors
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }

            throw error;
        }
    }

    // Convenience methods
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    async put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Generate cryptographically secure random string
 */
function generateSecureRandom(length = 32) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Secure localStorage with encryption (simple XOR - use better encryption in production)
 */
class SecureStorage {
    constructor(encryptionKey = null) {
        this.key = encryptionKey || this.generateKey();
    }

    generateKey() {
        // In production, derive this from user password or get from secure source
        return generateSecureRandom(32);
    }

    encrypt(data) {
        // ⚠️ This is a simple XOR cipher for demonstration
        // Use a proper encryption library in production (e.g., crypto-js)
        const json = JSON.stringify(data);
        let encrypted = '';
        for (let i = 0; i < json.length; i++) {
            encrypted += String.fromCharCode(
                json.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
            );
        }
        return btoa(encrypted);
    }

    decrypt(encrypted) {
        try {
            const decoded = atob(encrypted);
            let decrypted = '';
            for (let i = 0; i < decoded.length; i++) {
                decrypted += String.fromCharCode(
                    decoded.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
                );
            }
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    setItem(key, value) {
        const encrypted = this.encrypt(value);
        localStorage.setItem(key, encrypted);
    }

    getItem(key) {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        return this.decrypt(encrypted);
    }

    removeItem(key) {
        localStorage.removeItem(key);
    }

    clear() {
        localStorage.clear();
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // CSP
    CSP_POLICY,
    generateCSPHeader,

    // Middleware
    securityHeadersMiddleware,

    // Cookies
    COOKIE_OPTIONS,
    getCookieOptions,

    // Validation
    FrontendInputValidator,

    // React Hooks (if using React)
    // useSecureInput,
    // useCSRFToken,

    // API Client
    SecureAPIClient,

    // Utilities
    generateSecureRandom,
    SecureStorage
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Express/NestJS middleware
const { securityHeadersMiddleware } = require('./frontend-security');
app.use(securityHeadersMiddleware);

// Example 2: Set secure cookies
const { getCookieOptions } = require('./frontend-security');
res.cookie('sessionId', sessionId, getCookieOptions());

// Example 3: Validate user input
const { FrontendInputValidator } = require('./frontend-security');
const sanitized = FrontendInputValidator.sanitizeUserInput(userInput);

// Example 4: Secure API client
const { SecureAPIClient } = require('./frontend-security');
const api = new SecureAPIClient({ baseURL: '/api' });
await api.init();
const data = await api.post('/jobs', { type: 'ai', task: 'inference' });

// Example 5: Secure localStorage
const { SecureStorage } = require('./frontend-security');
const storage = new SecureStorage();
storage.setItem('user', { id: 123, name: 'John' });
const user = storage.getItem('user');

// Example 6: React hook (in React component)
import { useSecureInput, useCSRFToken } from './frontend-security';

function MyForm() {
    const email = useSecureInput('email');
    const password = useSecureInput('password', { validateStrength: true });
    const csrfToken = useCSRFToken();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (email.error || password.error) {
            alert('Please fix validation errors');
            return;
        }

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({
                email: email.value,
                password: password.value
            })
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                value={email.value}
                onChange={(e) => email.setValue(e.target.value)}
            />
            {email.error && <span>{email.error}</span>}

            <input
                type="password"
                value={password.value}
                onChange={(e) => password.setValue(e.target.value)}
            />
            {password.error && <span>{password.error}</span>}

            <button type="submit">Login</button>
        </form>
    );
}
*/
