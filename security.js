// =========================================
// Security Utility Functions
// Enhanced for KolayİSTAKİP CRM
// =========================================

const Security = {
    /**
     * Sanitize HTML to prevent XSS attacks
     * @param {string} str - String to sanitize
     * @returns {string} - Sanitized string
     */
    sanitize: (str) => {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid
     */
    isValidEmail: (email) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    },

    /**
     * Check password strength
     * @param {string} password - Password to check
     * @returns {object} - Strength score and details
     */
    checkPasswordStrength: (password) => {
        const result = {
            score: 0,
            isStrong: false,
            checks: {
                length: password.length >= 8,
                upper: /[A-Z]/.test(password),
                lower: /[a-z]/.test(password),
                number: /[0-9]/.test(password),
                special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
            }
        };

        if (result.checks.length) result.score++;
        if (result.checks.upper && result.checks.lower) result.score++;
        if (result.checks.number) result.score++;
        if (result.checks.special) result.score++;

        result.isStrong = result.score >= 4;
        return result;
    },

    /**
     * Validate phone number (Turkish format)
     * @param {string} phone - Phone number to validate
     * @returns {boolean} - True if valid
     */
    isValidPhone: (phone) => {
        // Remove all non-digits
        const cleaned = phone.replace(/\D/g, '');
        // Turkish phone: 10 or 11 digits starting with 0 or 90
        return cleaned.length >= 10 && cleaned.length <= 12;
    },

    /**
     * Escape special regex characters
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeRegex: (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} - True if valid
     */
    isValidUrl: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Rate limit check - prevents too many requests
     * @param {string} key - Unique key for the action
     * @param {number} maxAttempts - Max attempts allowed
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} - True if allowed, false if rate limited
     */
    checkRateLimit: (key, maxAttempts = 5, windowMs = 60000) => {
        const storageKey = `rateLimit_${key}`;
        const now = Date.now();
        let attempts = JSON.parse(localStorage.getItem(storageKey) || '[]');

        // Filter out old attempts
        attempts = attempts.filter(time => now - time < windowMs);

        if (attempts.length >= maxAttempts) {
            return false; // Rate limited
        }

        attempts.push(now);
        localStorage.setItem(storageKey, JSON.stringify(attempts));
        return true;
    },

    /**
     * Generate a random token for CSRF protection
     * @param {number} length - Token length
     * @returns {string} - Random token
     */
    generateToken: (length = 32) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            result += chars[array[i] % chars.length];
        }
        return result;
    },

    /**
     * Truncate text safely
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} - Truncated text
     */
    truncate: (text, maxLength = 100) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
};

// Expose to window
window.Security = Security;

console.log('🔒 Security utilities loaded');
