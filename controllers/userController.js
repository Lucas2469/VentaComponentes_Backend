const UserModel = require('../models/userModel');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseUtils');

/**
 * Controlador para gestión de usuarios
 */
class UserController {
    
    /**
     * Obtener todos los usuarios con filtros y paginación
     * GET /api/users
     */
    static async getAllUsers(req, res) {
        try {
            const filters = req.queryParams;
            
            // Obtener usuarios y total de registros en paralelo
            const [users, totalCount] = await Promise.all([
                UserModel.getAllUsers(filters),
                UserModel.countUsers(filters)
            ]);
            
            const pagination = {
                page: filters.page,
                limit: filters.limit,
                total: totalCount
            };
            
            return paginatedResponse(
                res, 
                users, 
                pagination, 
                'Usuarios obtenidos exitosamente'
            );
            
        } catch (error) {
            console.error('Error en getAllUsers:', error);
            return errorResponse(res, 'Error al obtener usuarios', 500);
        }
    }
    
    /**
     * Obtener usuario por ID
     * GET /api/users/:id
     */
    static async getUserById(req, res) {
        try {
            const userId = req.userId;
            
            const user = await UserModel.getUserById(userId);
            
            if (!user) {
                return errorResponse(res, 'Usuario no encontrado', 404);
            }
            
            return successResponse(res, user, 'Usuario obtenido exitosamente');
            
        } catch (error) {
            console.error('Error en getUserById:', error);
            return errorResponse(res, 'Error al obtener el usuario', 500);
        }
    }
    
    /**
     * Obtener usuarios por tipo
     * GET /api/users/type/:tipo
     */
    static async getUsersByType(req, res) {
        try {
            const { tipo } = req.params;
            const filters = req.queryParams;
            
            // Validar tipo de usuario
            const validTypes = ['comprador', 'vendedor', 'admin'];
            if (!validTypes.includes(tipo)) {
                return errorResponse(res, 'Tipo de usuario inválido. Debe ser: comprador, vendedor o admin', 400);
            }
            
            // Obtener usuarios y total de registros en paralelo
            const [users, totalCount] = await Promise.all([
                UserModel.getUsersByType(tipo, filters),
                UserModel.countUsers({ ...filters, tipo_usuario: tipo })
            ]);
            
            const pagination = {
                page: filters.page,
                limit: filters.limit,
                total: totalCount
            };
            
            return paginatedResponse(
                res, 
                users, 
                pagination, 
                `Usuarios de tipo "${tipo}" obtenidos exitosamente`
            );
            
        } catch (error) {
            console.error('Error en getUsersByType:', error);
            return errorResponse(res, 'Error al obtener usuarios por tipo', 500);
        }
    }
    
    /**
     * Buscar usuarios
     * GET /api/users/search?q=termino
     */
    static async searchUsers(req, res) {
        try {
            const { q } = req.query;
            
            if (!q || q.trim().length < 2) {
                return errorResponse(res, 'El término de búsqueda debe tener al menos 2 caracteres', 400);
            }
            
            const filters = {
                ...req.queryParams,
                search: q.trim()
            };
            
            const [users, totalCount] = await Promise.all([
                UserModel.getAllUsers(filters),
                UserModel.countUsers(filters)
            ]);
            
            const pagination = {
                page: filters.page,
                limit: filters.limit,
                total: totalCount
            };
            
            return paginatedResponse(
                res, 
                users, 
                pagination, 
                `Resultados de búsqueda para "${q}"`
            );
            
        } catch (error) {
            console.error('Error en searchUsers:', error);
            return errorResponse(res, 'Error al buscar usuarios', 500);
        }
    }
    
    /**
     * Obtener estadísticas de usuarios
     * GET /api/users/stats
     */
    static async getUserStats(req, res) {
        try {
            const stats = await UserModel.getUserStats();
            
            return successResponse(res, stats, 'Estadísticas de usuarios obtenidas exitosamente');
            
        } catch (error) {
            console.error('Error en getUserStats:', error);
            return errorResponse(res, 'Error al obtener estadísticas', 500);
        }
    }
    
    /**
     * Obtener vendedores mejor calificados
     * GET /api/users/top-vendedores
     */
    static async getTopVendedores(req, res) {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 10;

            if (limitNum < 1 || limitNum > 50) {
                return errorResponse(res, 'El límite debe ser entre 1 y 50', 400);
            }

            const topVendedores = await UserModel.getTopVendedores(limitNum);

            return successResponse(
                res,
                topVendedores,
                'Top vendedores obtenidos exitosamente'
            );

        } catch (error) {
            console.error('Error en getTopVendedores:', error);
            return errorResponse(res, 'Error al obtener top vendedores', 500);
        }
    }

    /**
     * Obtener compradores más activos
     * GET /api/users/top-compradores
     */
    static async getTopCompradores(req, res) {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 10;

            if (limitNum < 1 || limitNum > 50) {
                return errorResponse(res, 'El límite debe ser entre 1 y 50', 400);
            }

            const topCompradores = await UserModel.getTopCompradores(limitNum);

            return successResponse(
                res,
                topCompradores,
                'Top compradores obtenidos exitosamente'
            );

        } catch (error) {
            console.error('Error en getTopCompradores:', error);
            return errorResponse(res, 'Error al obtener top compradores', 500);
        }
    }

    /**
     * Actualizar perfil de usuario
     * PUT /api/users/:id
     */
    static async updateProfile(req, res) {
        try {
            const userId = req.userId;
            const { nombre, apellido, email, telefono } = req.body;

            // Validar que al menos un campo esté presente
            if (!nombre && !apellido && !email && !telefono) {
                return errorResponse(res, 'Debe proporcionar al menos un campo para actualizar', 400);
            }

            // Verificar que el usuario existe
            const user = await UserModel.getUserById(userId);
            if (!user) {
                return errorResponse(res, 'Usuario no encontrado', 404);
            }

            // Actualizar solo los campos proporcionados
            const updateData = {};
            if (nombre !== undefined) updateData.nombre = nombre;
            if (apellido !== undefined) updateData.apellido = apellido;
            if (email !== undefined) updateData.email = email;
            if (telefono !== undefined) updateData.telefono = telefono;

            const success = await UserModel.updateUser(userId, updateData);

            if (success) {
                const updatedUser = await UserModel.getUserById(userId);
                return successResponse(res, updatedUser, 'Perfil actualizado exitosamente');
            } else {
                return errorResponse(res, 'Error al actualizar perfil', 500);
            }

        } catch (error) {
            console.error('Error en updateProfile:', error);
            return errorResponse(res, 'Error al actualizar perfil', 500);
        }
    }

    /**
     * Cambiar contraseña
     * PUT /api/users/:id/change-password
     */
    static async changePassword(req, res) {
        try {
            const userId = req.userId;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return errorResponse(res, 'Debe proporcionar la contraseña actual y la nueva', 400);
            }

            if (newPassword.length < 6) {
                return errorResponse(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
            }

            // Verificar contraseña actual
            const isValid = await UserModel.verifyPassword(userId, currentPassword);
            if (!isValid) {
                return errorResponse(res, 'La contraseña actual es incorrecta', 401);
            }

            // Actualizar contraseña
            const success = await UserModel.updatePassword(userId, newPassword);

            if (success) {
                return successResponse(res, null, 'Contraseña actualizada exitosamente');
            } else {
                return errorResponse(res, 'Error al actualizar contraseña', 500);
            }

        } catch (error) {
            console.error('Error en changePassword:', error);
            return errorResponse(res, 'Error al cambiar contraseña', 500);
        }
    }

    /**
     * Actualizar estado de usuario (solo admin)
     * PUT /api/users/:id/status
     */
    static async updateUserStatus(req, res) {
        try {
            const userId = req.userId;
            const { estado } = req.body;

            // TODO: Reemplazar con autenticación real cuando esté implementada
            // Por ahora usamos el middleware mockAdminAuth que simula admin autenticado

            // Verificar que el usuario autenticado sea admin
            if (!req.currentUser || req.currentUser.tipo_usuario !== 'admin') {
                return errorResponse(res, 'Acceso denegado. Solo administradores pueden realizar esta acción', 403);
            }

            // Validar que el estado sea válido
            const validStates = ['activo', 'inactivo', 'suspendido'];
            if (!estado || !validStates.includes(estado)) {
                return errorResponse(res, 'Estado inválido. Debe ser: activo, inactivo o suspendido', 400);
            }

            // Verificar que el usuario existe
            const user = await UserModel.getUserById(userId);
            if (!user) {
                return errorResponse(res, 'Usuario no encontrado', 404);
            }

            // No permitir cambiar estado de otros admins
            if (user.tipo_usuario === 'admin') {
                return errorResponse(res, 'No se puede modificar el estado de otros administradores', 403);
            }

            // Actualizar el estado
            const success = await UserModel.updateUserStatus(userId, estado);

            if (success) {
                return successResponse(
                    res,
                    { id: userId, estado },
                    `Usuario ${estado === 'activo' ? 'activado' : 'desactivado'} exitosamente`
                );
            } else {
                return errorResponse(res, 'Error al actualizar el estado del usuario', 500);
            }

        } catch (error) {
            console.error('Error en updateUserStatus:', error);
            return errorResponse(res, 'Error al actualizar estado del usuario', 500);
        }
    }
}

module.exports = UserController;