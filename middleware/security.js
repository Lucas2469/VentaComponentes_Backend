const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * Rate limiting para endpoints de autenticación
 */
const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // 5 intentos por IP
    message: {
        success: false,
        error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // No contar requests exitosos
});

/**
 * Rate limiting general para la API
 */
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests por IP
    message: {
        success: false,
        error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

/**
 * Rate limiting estricto para endpoints sensibles
 */
const strictLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 3, // 3 intentos por IP
    message: {
        success: false,
        error: 'Demasiados intentos. Intenta de nuevo en 5 minutos.',
        retryAfter: '5 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

/**
 * Configuración de Helmet para seguridad
 */
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false, // Deshabilitado para compatibilidad con uploads
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

/**
 * Middleware para validar origen de requests
 */
const validateOrigin = (req, res, next) => {
    const origin = req.get('Origin');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
    
    // Permitir requests sin origin (Postman, etc.) en desarrollo
    if (process.env.NODE_ENV === 'development' && !origin) {
        return next();
    }
    
    if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({
            success: false,
            error: 'Origen no permitido',
            allowedOrigins: process.env.NODE_ENV === 'development' ? allowedOrigins : undefined
        });
    }
    
    next();
};

/**
 * Middleware para sanitizar inputs básicos
 */
const sanitizeInputs = (req, res, next) => {
    // Función para sanitizar strings
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
            .replace(/javascript:/gi, '') // Remover javascript:
            .replace(/on\w+\s*=/gi, '') // Remover event handlers
            .trim();
    };

    // Sanitizar body
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        }
    }

    // Sanitizar query params
    if (req.query && typeof req.query === 'object') {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        }
    }

    next();
};

/**
 * Middleware para logging de requests
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log del request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
    
    // Interceptar el res.end para loggear la respuesta
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`);
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

/**
 * Middleware para manejar errores de CORS
 */
const corsErrorHandler = (err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'Origen no permitido por CORS',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    next(err);
};

module.exports = {
    authLimiter,
    apiLimiter,
    strictLimiter,
    helmetConfig,
    validateOrigin,
    sanitizeInputs,
    requestLogger,
    corsErrorHandler
};
