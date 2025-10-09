-- ================================================
-- TABLA: refresh_tokens
-- Descripción: Almacena los refresh tokens para
--              permitir logout real y revocación
-- ================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token_id VARCHAR(36) NOT NULL UNIQUE,  -- UUID del tokenId
    token_hash VARCHAR(255) NOT NULL,       -- Hash del refresh token
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,              -- NULL = válido, fecha = revocado
    revoked_reason VARCHAR(100) NULL,       -- Razón de revocación
    ip_address VARCHAR(45) NULL,            -- IPv4 o IPv6
    user_agent TEXT NULL,                   -- User agent del navegador
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token_id (token_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_revoked_at (revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- COMENTARIOS DE TABLA
-- ================================================
ALTER TABLE refresh_tokens COMMENT = 'Almacena refresh tokens para gestión de sesiones y logout real';

