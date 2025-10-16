/**
 * Input Validation and Sanitization Utilities
 * Protects against injection attacks, XSS, and malformed data
 */

// Validate Solana wallet address format
function isValidSolanaAddress(address) {
    if (!address || typeof address !== 'string') return false;
    // Solana addresses are base58 encoded, 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Validate email format
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
}

// Sanitize string input to prevent XSS
function sanitizeString(input) {
    if (typeof input !== 'string') return '';

    // More comprehensive sanitization
    let sanitized = input
        .replace(/[<>'"]/g, '') // Remove dangerous characters
        .replace(/javascript\s*:/gi, '') // Remove javascript: protocol (with whitespace)
        .replace(/data\s*:/gi, '') // Remove data: protocol
        .replace(/vbscript\s*:/gi, '') // Remove vbscript: protocol
        .replace(/file\s*:/gi, '') // Remove file: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/&lt;/gi, '') // Remove encoded <
        .replace(/&gt;/gi, '') // Remove encoded >
        .trim()
        .slice(0, 1000); // Limit length

    // Additional check: if input contains suspicious URL schemes, return empty
    const dangerousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i,
        /<script/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
            return '';
        }
    }

    return sanitized;
}

// Validate and sanitize worker ID
function validateWorkerId(workerId) {
    if (!workerId || typeof workerId !== 'string') {
        throw new Error('Worker ID is required and must be a string');
    }

    // Allow alphanumeric, hyphens, underscores (3-50 chars)
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(workerId)) {
        throw new Error('Invalid worker ID format (3-50 alphanumeric characters, hyphens, or underscores)');
    }

    return workerId;
}

// Validate numeric input
function validateNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const num = Number(value);

    if (isNaN(num)) {
        throw new Error(`Invalid number: ${value}`);
    }

    if (num < min || num > max) {
        throw new Error(`Number must be between ${min} and ${max}`);
    }

    return num;
}

// Validate GPU count
function validateGPUCount(count) {
    return validateNumber(count, 1, 1000); // Max 1000 GPUs per farm
}

// Validate JSON payload size and structure
function validateJsonPayload(data, maxSize = 1024 * 100) { // 100KB max
    try {
        const jsonString = JSON.stringify(data);

        if (jsonString.length > maxSize) {
            throw new Error(`Payload too large: ${jsonString.length} bytes (max: ${maxSize})`);
        }

        return data;
    } catch (error) {
        throw new Error('Invalid JSON payload');
    }
}

// Validate hardware info structure
function validateHardwareInfo(hardwareInfo) {
    if (!hardwareInfo || typeof hardwareInfo !== 'object') {
        throw new Error('Hardware info must be an object');
    }

    const validated = {};

    // GPU Count (optional, but if present must be valid)
    if (hardwareInfo.gpuCount !== undefined) {
        validated.gpuCount = validateGPUCount(hardwareInfo.gpuCount);
    }

    // GPU Type (optional string)
    if (hardwareInfo.gpuType) {
        validated.gpuType = sanitizeString(hardwareInfo.gpuType).slice(0, 100);
    }

    // Location (optional string)
    if (hardwareInfo.location) {
        validated.location = sanitizeString(hardwareInfo.location).slice(0, 200);
    }

    // Hashrate (optional number)
    if (hardwareInfo.hashrate !== undefined) {
        validated.hashrate = validateNumber(hardwareInfo.hashrate, 0, 1e15);
    }

    return validated;
}

// Validate farm registration input
function validateFarmRegistration(data) {
    const errors = [];

    // Name validation
    if (!data.name || typeof data.name !== 'string') {
        errors.push('Farm name is required');
    } else if (data.name.length < 3 || data.name.length > 100) {
        errors.push('Farm name must be 3-100 characters');
    }

    // Wallet validation
    if (!data.wallet) {
        errors.push('Wallet address is required');
    } else if (!isValidSolanaAddress(data.wallet)) {
        errors.push('Invalid Solana wallet address');
    }

    // GPU Count validation
    if (!data.gpuCount) {
        errors.push('GPU count is required');
    } else {
        try {
            validateGPUCount(data.gpuCount);
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        name: sanitizeString(data.name),
        wallet: data.wallet,
        gpuCount: parseInt(data.gpuCount),
        gpuType: data.gpuType ? sanitizeString(data.gpuType) : undefined,
        location: data.location ? sanitizeString(data.location) : undefined
    };
}

// Validate community member registration
function validateCommunityRegistration(data) {
    const errors = [];

    // Email validation
    if (!data.email) {
        errors.push('Email is required');
    } else if (!isValidEmail(data.email)) {
        errors.push('Invalid email address');
    }

    // Username validation
    if (!data.username || typeof data.username !== 'string') {
        errors.push('Username is required');
    } else if (!/^[a-zA-Z0-9_-]{3,30}$/.test(data.username)) {
        errors.push('Username must be 3-30 alphanumeric characters, hyphens, or underscores');
    }

    // Wallet validation (optional)
    if (data.walletAddress && !isValidSolanaAddress(data.walletAddress)) {
        errors.push('Invalid wallet address');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        email: data.email.toLowerCase().trim(),
        username: sanitizeString(data.username),
        fullName: data.fullName ? sanitizeString(data.fullName) : undefined,
        walletAddress: data.walletAddress || undefined
    };
}

module.exports = {
    isValidSolanaAddress,
    isValidEmail,
    sanitizeString,
    validateWorkerId,
    validateNumber,
    validateGPUCount,
    validateJsonPayload,
    validateHardwareInfo,
    validateFarmRegistration,
    validateCommunityRegistration
};
