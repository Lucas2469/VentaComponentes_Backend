const RefreshTokenModel = require('../models/refreshTokenModel');

/**
 * Servicio para limpieza automática de refresh tokens expirados
 */
class TokenCleanupService {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
    }

    /**
     * Iniciar el servicio de limpieza automática
     * @param {number} intervalHours - Intervalo en horas para ejecutar la limpieza (default: 24)
     * @param {number} daysOld - Eliminar tokens expirados hace más de X días (default: 30)
     */
    start(intervalHours = 24, daysOld = 30) {
        if (this.isRunning) {
            console.log('⚠️  Servicio de limpieza de tokens ya está ejecutándose');
            return;
        }

        console.log(`🧹 Iniciando servicio de limpieza de tokens (cada ${intervalHours}h, tokens > ${daysOld} días)`);

        // Ejecutar inmediatamente la primera vez
        this.cleanup(daysOld);

        // Configurar ejecución periódica
        const intervalMs = intervalHours * 60 * 60 * 1000;
        this.intervalId = setInterval(() => {
            this.cleanup(daysOld);
        }, intervalMs);

        this.isRunning = true;
    }

    /**
     * Detener el servicio de limpieza
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('🛑 Servicio de limpieza de tokens detenido');
        }
    }

    /**
     * Ejecutar limpieza de tokens expirados
     * @param {number} daysOld - Días de antigüedad
     */
    async cleanup(daysOld = 30) {
        try {
            console.log(`🧹 Ejecutando limpieza de tokens expirados (> ${daysOld} días)...`);
            
            const deletedCount = await RefreshTokenModel.cleanupExpiredTokens(daysOld);
            
            if (deletedCount > 0) {
                console.log(`✅ Limpieza completada: ${deletedCount} tokens eliminados`);
            } else {
                console.log('✅ Limpieza completada: sin tokens para eliminar');
            }

            // Opcional: Mostrar estadísticas
            if (process.env.NODE_ENV === 'development') {
                const stats = await RefreshTokenModel.getTokenStats();
                console.log('📊 Estadísticas de tokens:', {
                    activos: stats.active_tokens,
                    revocados: stats.revoked_tokens,
                    expirados: stats.expired_tokens,
                    total: stats.total_tokens
                });
            }

        } catch (error) {
            console.error('❌ Error en limpieza de tokens:', error.message);
        }
    }

    /**
     * Verificar si el servicio está ejecutándose
     */
    isServiceRunning() {
        return this.isRunning;
    }
}

// Exportar instancia singleton
module.exports = new TokenCleanupService();

