const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const NotificationModel = require('../models/notificationModel');

/**
 * Servicio de WebSocket para notificaciones en tiempo real
 */
class WebSocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> socket.id
        this.userSockets = new Map(); // socket.id -> userId
    }

    /**
     * Inicializar Socket.IO con el servidor HTTP
     * @param {object} httpServer - Servidor HTTP de Express
     */
    initialize(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });

        // Middleware de autenticación para Socket.IO
        this.io.use(this.authMiddleware.bind(this));

        // Configurar eventos de conexión
        this.io.on('connection', this.handleConnection.bind(this));

        console.log('🔌 WebSocket Service initialized');
    }

    /**
     * Middleware de autenticación para sockets
     */
    async authMiddleware(socket, next) {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication token required'));
            }

            // Verificar token JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (!decoded.userId) {
                return next(new Error('Invalid token'));
            }

            // Agregar datos del usuario al socket
            socket.userId = decoded.userId;
            socket.userEmail = decoded.email;
            socket.userTipo = decoded.tipo_usuario;

            next();

        } catch (error) {
            console.error('Socket auth error:', error.message);
            next(new Error('Invalid or expired token'));
        }
    }

    /**
     * Manejar nueva conexión de socket
     */
    handleConnection(socket) {
        const userId = socket.userId;

        console.log(`✅ User ${userId} connected (Socket: ${socket.id})`);

        // Registrar conexión
        this.connectedUsers.set(userId, socket.id);
        this.userSockets.set(socket.id, userId);

        // Unir al usuario a su room personal
        socket.join(`user:${userId}`);

        // Enviar confirmación de conexión
        socket.emit('connected', {
            success: true,
            message: 'Connected to notification server',
            userId: userId
        });

        // Enviar conteo de notificaciones no leídas
        this.sendUnreadCount(userId);

        // Eventos del socket
        this.setupSocketEvents(socket);

        // Manejar desconexión
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    /**
     * Configurar eventos del socket
     */
    setupSocketEvents(socket) {
        const userId = socket.userId;

        // Marcar notificación como leída
        socket.on('mark_as_read', async (data) => {
            try {
                const { notificationId } = data;
                const success = await NotificationModel.markAsRead(notificationId, userId);
                
                if (success) {
                    socket.emit('notification_read', { notificationId });
                    this.sendUnreadCount(userId);
                }
            } catch (error) {
                console.error('Error marking notification as read:', error);
                socket.emit('error', { message: 'Error al marcar notificación' });
            }
        });

        // Marcar todas como leídas
        socket.on('mark_all_as_read', async () => {
            try {
                const count = await NotificationModel.markAllAsRead(userId);
                socket.emit('all_notifications_read', { count });
                this.sendUnreadCount(userId);
            } catch (error) {
                console.error('Error marking all as read:', error);
                socket.emit('error', { message: 'Error al marcar todas las notificaciones' });
            }
        });

        // Solicitar notificaciones
        socket.on('get_notifications', async (data = {}) => {
            try {
                const notifications = await NotificationModel.getUserNotifications(userId, data.filters);
                socket.emit('notifications_list', { notifications });
            } catch (error) {
                console.error('Error getting notifications:', error);
                socket.emit('error', { message: 'Error al obtener notificaciones' });
            }
        });

        // Solicitar conteo de no leídas
        socket.on('get_unread_count', () => {
            this.sendUnreadCount(userId);
        });

        // Ping/Pong para mantener conexión
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });
    }

    /**
     * Manejar desconexión
     */
    handleDisconnect(socket) {
        const userId = socket.userId;
        
        console.log(`❌ User ${userId} disconnected (Socket: ${socket.id})`);

        // Limpiar registros
        this.connectedUsers.delete(userId);
        this.userSockets.delete(socket.id);
    }

    /**
     * Enviar notificación a un usuario específico
     * @param {number} userId - ID del usuario
     * @param {object} notification - Datos de la notificación
     */
    async sendNotificationToUser(userId, notification) {
        try {
            // Crear notificación en BD
            const notificationId = await NotificationModel.createNotification({
                usuario_id: userId,
                ...notification
            });

            // Obtener la notificación completa
            const fullNotification = await NotificationModel.getNotificationById(notificationId, userId);

            // Enviar por WebSocket si el usuario está conectado
            const socketId = this.connectedUsers.get(userId);
            if (socketId) {
                this.io.to(`user:${userId}`).emit('nueva_notificacion', fullNotification);
                this.sendUnreadCount(userId);
            }

            return notificationId;

        } catch (error) {
            console.error('Error sending notification to user:', error);
            throw error;
        }
    }

    /**
     * Enviar notificación a múltiples usuarios
     * @param {Array<number>} userIds - Array de IDs de usuarios
     * @param {object} notification - Datos de la notificación
     */
    async sendNotificationToMultipleUsers(userIds, notification) {
        const results = [];

        for (const userId of userIds) {
            try {
                const notificationId = await this.sendNotificationToUser(userId, notification);
                results.push({ userId, notificationId, success: true });
            } catch (error) {
                console.error(`Error sending notification to user ${userId}:`, error);
                results.push({ userId, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Enviar conteo de notificaciones no leídas
     * @param {number} userId - ID del usuario
     */
    async sendUnreadCount(userId) {
        try {
            const count = await NotificationModel.countUnread(userId);
            this.io.to(`user:${userId}`).emit('unread_count', { count });
        } catch (error) {
            console.error('Error sending unread count:', error);
        }
    }

    /**
     * Broadcast a todos los usuarios conectados
     * @param {string} event - Nombre del evento
     * @param {object} data - Datos a enviar
     */
    broadcastToAll(event, data) {
        this.io.emit(event, data);
    }

    /**
     * Broadcast a usuarios con un rol específico
     * @param {string} role - Rol de usuario (admin, vendedor, comprador)
     * @param {string} event - Nombre del evento
     * @param {object} data - Datos a enviar
     */
    broadcastToRole(role, event, data) {
        // Filtrar sockets por rol y enviar
        this.io.sockets.sockets.forEach((socket) => {
            if (socket.userTipo === role) {
                socket.emit(event, data);
            }
        });
    }

    /**
     * Verificar si un usuario está conectado
     * @param {number} userId - ID del usuario
     * @returns {boolean}
     */
    isUserConnected(userId) {
        return this.connectedUsers.has(userId);
    }

    /**
     * Obtener estadísticas de conexiones
     * @returns {object}
     */
    getStats() {
        return {
            connectedUsers: this.connectedUsers.size,
            totalSockets: this.io?.sockets.sockets.size || 0,
            usersByRole: this.getUsersByRole()
        };
    }

    /**
     * Obtener usuarios agrupados por rol
     * @returns {object}
     */
    getUsersByRole() {
        const roleCount = { admin: 0, vendedor: 0, comprador: 0 };
        
        if (this.io) {
            this.io.sockets.sockets.forEach((socket) => {
                const role = socket.userTipo;
                if (roleCount[role] !== undefined) {
                    roleCount[role]++;
                }
            });
        }

        return roleCount;
    }

    /**
     * Desconectar a un usuario específico
     * @param {number} userId - ID del usuario
     * @param {string} reason - Razón de desconexión
     */
    disconnectUser(userId, reason = 'Disconnected by server') {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit('force_disconnect', { reason });
                socket.disconnect(true);
            }
        }
    }

    /**
     * Obtener Socket.IO instance
     * @returns {Server}
     */
    getIO() {
        return this.io;
    }
}

// Exportar instancia singleton
module.exports = new WebSocketService();

