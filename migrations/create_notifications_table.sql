-- ================================================
-- TABLA: notifications
-- Descripción: Sistema de notificaciones en tiempo real
-- ================================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    datos JSON NULL,
    leida BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP NULL,
    enlace VARCHAR(500) NULL,
    prioridad ENUM('baja', 'media', 'alta', 'urgente') DEFAULT 'media',
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_leida (leida),
    INDEX idx_fecha_creacion (fecha_creacion),
    INDEX idx_tipo (tipo),
    INDEX idx_prioridad (prioridad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- COMENTARIOS DE TABLA
-- ================================================
ALTER TABLE notifications COMMENT = 'Sistema de notificaciones en tiempo real para usuarios';

-- ================================================
-- TIPOS DE NOTIFICACIONES SOPORTADOS
-- ================================================
-- 'mensaje' - Mensajes entre usuarios
-- 'cita' - Notificaciones de citas/agendamientos
-- 'producto' - Actualizaciones de productos
-- 'sistema' - Notificaciones del sistema
-- 'calificacion' - Nuevas calificaciones recibidas
-- 'credito' - Movimientos de créditos
-- 'alerta' - Alertas importantes

