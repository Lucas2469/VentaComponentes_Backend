const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Utilidades para autenticación JWT y hash de contraseñas
 */

/**
 * Generar hash de contraseña usando bcrypt
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} - Hash de la contraseña
 */
const hashPassword = async (password) => {
    try {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Error al procesar la contraseña');
    }
};

/**
 * Verificar contraseña contra hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado
 * @returns {Promise<boolean>} - True si la contraseña es correcta
 */
const verifyPassword = async (password, hash) => {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('Error verifying password:', error);
        throw new Error('Error al verificar la contraseña');
    }
};

/**
 * Generar token JWT de acceso
 * @param {object} user - Objeto usuario
 * @returns {string} - Token JWT
 */
const generateAccessToken = (user) => {
    try {
        const payload = {
            userId: user.id,
            email: user.email,
            tipo_usuario: user.tipo_usuario,
            nombre: user.nombre,
            apellido: user.apellido
        };

        const options = {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            issuer: 'electromarket-api',
            audience: 'electromarket-client'
        };

        return jwt.sign(payload, process.env.JWT_SECRET, options);
    } catch (error) {
        console.error('Error generating access token:', error);
        throw new Error('Error al generar token de acceso');
    }
};

/**
 * Generar token JWT de refresh con tokenId
 * @param {object} user - Objeto usuario
 * @param {string} tokenId - UUID opcional (si no se provee, se genera uno nuevo)
 * @returns {object} - { token, tokenId, expiresAt }
 */
const generateRefreshToken = (user, tokenId = null) => {
    try {
        const generatedTokenId = tokenId || crypto.randomUUID();
        
        const payload = {
            userId: user.id,
            type: 'refresh',
            tokenId: generatedTokenId
        };

        const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        const options = {
            expiresIn,
            issuer: 'electromarket-api',
            audience: 'electromarket-client'
        };

        const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, options);
        
        // Calcular fecha de expiración
        const expiresAt = new Date();
        const days = parseInt(expiresIn.replace('d', '')) || 7;
        expiresAt.setDate(expiresAt.getDate() + days);

        return {
            token,
            tokenId: generatedTokenId,
            expiresAt
        };
    } catch (error) {
        console.error('Error generating refresh token:', error);
        throw new Error('Error al generar token de refresh');
    }
};

/**
 * Verificar token JWT
 * @param {string} token - Token JWT
 * @param {string} secret - Secreto para verificar
 * @returns {object} - Payload decodificado
 */
const verifyToken = (token, secret) => {
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Token inválido');
        } else if (error.name === 'TokenExpiredError') {
            throw new Error('Token expirado');
        } else {
            throw new Error('Error al verificar token');
        }
    }
};

/**
 * Decodificar token JWT sin verificar (para debugging)
 * @param {string} token - Token JWT
 * @returns {object} - Payload decodificado
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        throw new Error('Error al decodificar token');
    }
};

/**
 * Generar token de verificación de email
 * @param {string} email - Email del usuario
 * @returns {string} - Token de verificación
 */
const generateEmailVerificationToken = (email) => {
    try {
        const payload = {
            email,
            type: 'email_verification',
            tokenId: crypto.randomUUID()
        };

        const options = {
            expiresIn: '1h', // Token válido por 1 hora
            issuer: 'electromarket-api',
            audience: 'electromarket-client'
        };

        return jwt.sign(payload, process.env.JWT_SECRET, options);
    } catch (error) {
        console.error('Error generating email verification token:', error);
        throw new Error('Error al generar token de verificación');
    }
};

/**
 * Generar token de reset de contraseña
 * @param {string} email - Email del usuario
 * @returns {string} - Token de reset
 */
const generatePasswordResetToken = (email) => {
    try {
        const payload = {
            email,
            type: 'password_reset',
            tokenId: crypto.randomUUID()
        };

        const options = {
            expiresIn: '30m', // Token válido por 30 minutos
            issuer: 'electromarket-api',
            audience: 'electromarket-client'
        };

        return jwt.sign(payload, process.env.JWT_SECRET, options);
    } catch (error) {
        console.error('Error generating password reset token:', error);
        throw new Error('Error al generar token de reset');
    }
};

/**
 * Validar fortaleza de contraseña
 * @param {string} password - Contraseña a validar
 * @returns {object} - Resultado de la validación
 */
const validatePasswordStrength = (password) => {
    const errors = [];
    
    if (!password) {
        errors.push('La contraseña es requerida');
        return { isValid: false, errors };
    }
    
    if (password.length < 8) {
        errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    
    if (password.length > 128) {
        errors.push('La contraseña no puede tener más de 128 caracteres');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('La contraseña debe contener al menos una letra minúscula');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('La contraseña debe contener al menos una letra mayúscula');
    }
    
    if (!/\d/.test(password)) {
        errors.push('La contraseña debe contener al menos un número');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('La contraseña debe contener al menos un carácter especial');
    }
    
    // Verificar contraseñas comunes
    const commonPasswords = [
        'password', '123456', '123456789', 'qwerty', 'abc123',
        'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('La contraseña es muy común, elige una más segura');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        strength: errors.length === 0 ? 'strong' : 
                 errors.length <= 2 ? 'medium' : 'weak'
    };
};

/**
 * Validar formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - True si el email es válido
 */
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Generar código de verificación numérico
 * @param {number} length - Longitud del código (default: 6)
 * @returns {string} - Código de verificación
 */
const generateVerificationCode = (length = 6) => {
    const digits = '0123456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
        code += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return code;
};

/**
 * Generar token seguro para URLs
 * @param {number} length - Longitud del token (default: 32)
 * @returns {string} - Token seguro
 */
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

module.exports = {
    hashPassword,
    verifyPassword,
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    decodeToken,
    generateEmailVerificationToken,
    generatePasswordResetToken,
    validatePasswordStrength,
    validateEmail,
    generateVerificationCode,
    generateSecureToken
};
