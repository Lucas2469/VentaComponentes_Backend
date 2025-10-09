const UserModel = require('../models/userModel');
const RefreshTokenModel = require('../models/refreshTokenModel');
const { 
    generateAccessToken, 
    generateRefreshToken, 
    verifyToken,
    validateEmail,
    validatePasswordStrength 
} = require('../utils/authUtils');
const { successResponse, errorResponse } = require('../utils/responseUtils');

/**
 * Controlador de autenticación
 */
class AuthController {
    
    /**
     * Login de usuario
     * POST /api/auth/login
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validaciones básicas
            if (!email || !password) {
                return errorResponse(res, 'Email y contraseña son requeridos', 400);
            }

            // No validar formato de email - permitir username o email
            // if (!validateEmail(email)) {
            //     return errorResponse(res, 'Formato de email inválido', 400);
            // }

            // Verificar credenciales (email y contraseña)
            const user = await UserModel.verifyPasswordByEmail(email, password);

            // Mensaje genérico por seguridad (no revelar si email existe o no)
            if (!user) {
                return errorResponse(res, 'Email o contraseña incorrectos', 401);
            }

            if (user.estado !== 'activo') {
                return errorResponse(res, 'Usuario inactivo. Contacta al administrador', 401);
            }

            // Generar tokens
            const accessToken = generateAccessToken(user);
            const refreshTokenData = generateRefreshToken(user);

            // Almacenar refresh token en base de datos
            await RefreshTokenModel.storeRefreshToken({
                usuarioId: user.id,
                tokenId: refreshTokenData.tokenId,
                refreshToken: refreshTokenData.token,
                expiresAt: refreshTokenData.expiresAt,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Actualizar última actividad
            await UserModel.updateUser(user.id, { 
                fecha_ultima_actividad: new Date().toISOString() 
            });

            // Respuesta exitosa
            return successResponse(res, {
                user: {
                    id: user.id,
                    nombre: user.nombre,
                    apellido: user.apellido,
                    email: user.email,
                    telefono: user.telefono,
                    tipo_usuario: user.tipo_usuario,
                    creditos_disponibles: user.creditos_disponibles,
                    estado: user.estado,
                    fecha_registro: user.fecha_registro,
                    calificacion_promedio: user.calificacion_promedio,
                    total_intercambios_vendedor: user.total_intercambios_vendedor,
                    total_intercambios_comprador: user.total_intercambios_comprador
                },
                tokens: {
                    accessToken,
                    refreshToken: refreshTokenData.token,
                    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
                }
            }, 'Login exitoso');

        } catch (error) {
            console.error('Error en login:', error);
            return errorResponse(res, 'Error interno del servidor', 500);
        }
    }

    /**
     * Registro de usuario
     * POST /api/auth/register
     */
    static async register(req, res) {
        try {
            const { nombre, apellido, email, telefono, password, tipo_usuario } = req.body;

            // Validaciones básicas
            if (!nombre || !apellido || !email || !password) {
                return errorResponse(res, 'Nombre, apellido, email y contraseña son requeridos', 400);
            }

            if (!validateEmail(email)) {
                return errorResponse(res, 'Formato de email inválido', 400);
            }

            // Validar contraseña
            const passwordValidation = validatePasswordStrength(password);
            if (!passwordValidation.isValid) {
                return errorResponse(res, `Contraseña inválida: ${passwordValidation.errors.join(', ')}`, 400);
            }

            // Validar tipo de usuario
            const validUserTypes = ['comprador', 'vendedor'];
            if (tipo_usuario && !validUserTypes.includes(tipo_usuario)) {
                return errorResponse(res, 'Tipo de usuario inválido', 400);
            }

            // Crear usuario
            const userId = await UserModel.createUser({
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                email: email.toLowerCase().trim(),
                telefono: telefono?.trim() || null,
                password,
                tipo_usuario: tipo_usuario || 'comprador'
            });

            // Obtener usuario creado
            const newUser = await UserModel.getUserById(userId);

            // Generar tokens
            const accessToken = generateAccessToken(newUser);
            const refreshTokenData = generateRefreshToken(newUser);

            // Almacenar refresh token en base de datos
            await RefreshTokenModel.storeRefreshToken({
                usuarioId: newUser.id,
                tokenId: refreshTokenData.tokenId,
                refreshToken: refreshTokenData.token,
                expiresAt: refreshTokenData.expiresAt,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            return successResponse(res, {
                user: {
                    id: newUser.id,
                    nombre: newUser.nombre,
                    apellido: newUser.apellido,
                    email: newUser.email,
                    telefono: newUser.telefono,
                    tipo_usuario: newUser.tipo_usuario,
                    creditos_disponibles: newUser.creditos_disponibles,
                    estado: newUser.estado,
                    fecha_registro: newUser.fecha_registro
                },
                tokens: {
                    accessToken,
                    refreshToken: refreshTokenData.token,
                    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
                }
            }, 'Usuario registrado exitosamente', 201);

        } catch (error) {
            console.error('Error en registro:', error);
            
            // Manejar errores específicos
            if (error.message.includes('email ya está registrado')) {
                return errorResponse(res, 'El email ya está registrado', 409);
            }
            
            if (error.message.includes('Formato de email inválido')) {
                return errorResponse(res, 'Formato de email inválido', 400);
            }
            
            if (error.message.includes('Contraseña inválida')) {
                return errorResponse(res, error.message, 400);
            }

            return errorResponse(res, 'Error interno del servidor', 500);
        }
    }

    /**
     * Refresh token
     * POST /api/auth/refresh
     */
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return errorResponse(res, 'Refresh token requerido', 400);
            }

            // Verificar refresh token JWT
            const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
            
            if (decoded.type !== 'refresh') {
                return errorResponse(res, 'Token inválido', 401);
            }

            // Verificar refresh token en base de datos
            const tokenData = await RefreshTokenModel.verifyRefreshToken(decoded.tokenId, refreshToken);
            
            if (!tokenData) {
                return errorResponse(res, 'Refresh token inválido, expirado o revocado', 401);
            }

            // Obtener usuario
            const user = await UserModel.getUserById(decoded.userId);
            
            if (!user || user.estado !== 'activo') {
                return errorResponse(res, 'Usuario no encontrado o inactivo', 401);
            }

            // Revocar el refresh token anterior (rotación de tokens)
            await RefreshTokenModel.rotateRefreshToken(decoded.tokenId, 'token_rotation');

            // Generar nuevos tokens
            const newAccessToken = generateAccessToken(user);
            const newRefreshTokenData = generateRefreshToken(user);

            // Almacenar nuevo refresh token en base de datos
            await RefreshTokenModel.storeRefreshToken({
                usuarioId: user.id,
                tokenId: newRefreshTokenData.tokenId,
                refreshToken: newRefreshTokenData.token,
                expiresAt: newRefreshTokenData.expiresAt,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            return successResponse(res, {
                tokens: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshTokenData.token,
                    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
                }
            }, 'Tokens renovados exitosamente');

        } catch (error) {
            console.error('Error en refresh token:', error);
            
            if (error.message.includes('Token expirado')) {
                return errorResponse(res, 'Refresh token expirado. Inicia sesión nuevamente', 401);
            }
            
            if (error.message.includes('Token inválido')) {
                return errorResponse(res, 'Refresh token inválido', 401);
            }

            return errorResponse(res, 'Error interno del servidor', 500);
        }
    }

    /**
     * Logout (invalidar refresh token)
     * POST /api/auth/logout
     */
    static async logout(req, res) {
        try {
            const { refreshToken } = req.body;

            // Si se provee refresh token, invalidarlo específicamente
            if (refreshToken) {
                try {
                    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
                    
                    if (decoded.type === 'refresh' && decoded.tokenId) {
                        await RefreshTokenModel.revokeRefreshToken(decoded.tokenId, 'logout');
                    }
                } catch (error) {
                    // Si el token está mal formado o expirado, continuar de todas formas
                    console.log('Token ya inválido o mal formado:', error.message);
                }
            }

            // Alternativamente, invalidar todos los tokens del usuario (logout de todas las sesiones)
            // await RefreshTokenModel.revokeAllUserTokens(req.user.id, 'logout_all');

            return successResponse(res, null, 'Logout exitoso');

        } catch (error) {
            console.error('Error en logout:', error);
            return errorResponse(res, 'Error interno del servidor', 500);
        }
    }

    /**
     * Obtener perfil del usuario autenticado
     * GET /api/auth/profile
     */
    static async getProfile(req, res) {
        try {
            const user = req.user;

            return successResponse(res, {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                telefono: user.telefono,
                tipo_usuario: user.tipo_usuario,
                creditos_disponibles: user.creditos_disponibles,
                estado: user.estado,
                fecha_registro: user.fecha_registro,
                fecha_ultima_actividad: user.fecha_ultima_actividad,
                calificacion_promedio: user.calificacion_promedio,
                total_intercambios_vendedor: user.total_intercambios_vendedor,
                total_intercambios_comprador: user.total_intercambios_comprador
            }, 'Perfil obtenido exitosamente');

        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            return errorResponse(res, 'Error interno del servidor', 500);
        }
    }

    /**
     * Cambiar contraseña
     * PUT /api/auth/change-password
     */
    static async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            if (!currentPassword || !newPassword) {
                return errorResponse(res, 'Contraseña actual y nueva contraseña son requeridas', 400);
            }

            // Validar nueva contraseña
            const passwordValidation = validatePasswordStrength(newPassword);
            if (!passwordValidation.isValid) {
                return errorResponse(res, `Nueva contraseña inválida: ${passwordValidation.errors.join(', ')}`, 400);
            }

            // Verificar contraseña actual
            const isValidCurrentPassword = await UserModel.verifyPassword(userId, currentPassword);
            if (!isValidCurrentPassword) {
                return errorResponse(res, 'Contraseña actual incorrecta', 401);
            }

            // Actualizar contraseña
            const success = await UserModel.updatePassword(userId, newPassword);
            
            if (success) {
                return successResponse(res, null, 'Contraseña actualizada exitosamente');
            } else {
                return errorResponse(res, 'Error al actualizar contraseña', 500);
            }

        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            return errorResponse(res, 'Error interno del servidor', 500);
        }
    }

    /**
     * Verificar si el token es válido
     * GET /api/auth/verify
     */
    static async verifyToken(req, res) {
        try {
            // Si llegamos aquí, el middleware de autenticación ya verificó el token
            return successResponse(res, {
                valid: true,
                user: {
                    id: req.user.id,
                    nombre: req.user.nombre,
                    apellido: req.user.apellido,
                    email: req.user.email,
                    tipo_usuario: req.user.tipo_usuario
                }
            }, 'Token válido');

        } catch (error) {
            console.error('Error verificando token:', error);
            return errorResponse(res, 'Error interno del servidor', 500);
        }
    }
}

module.exports = AuthController;
