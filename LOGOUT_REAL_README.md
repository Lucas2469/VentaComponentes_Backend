# 🔐 Logout Real y Gestión de Refresh Tokens

## 📋 Resumen

Se ha implementado un sistema completo de logout real con gestión de refresh tokens en base de datos, incluyendo:

- ✅ Almacenamiento de refresh tokens en BD
- ✅ Validación de tokens contra BD
- ✅ Revocación de tokens en logout
- ✅ Rotación automática de tokens en refresh
- ✅ Limpieza automática de tokens expirados
- ✅ Auditoría con IP y User-Agent

---

## 🗄️ Estructura de Base de Datos

### Tabla: `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token_id VARCHAR(36) NOT NULL UNIQUE,  -- UUID del tokenId
    token_hash VARCHAR(255) NOT NULL,       -- Hash SHA-256 del token
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,              -- NULL = válido
    revoked_reason VARCHAR(100) NULL,       -- Razón de revocación
    ip_address VARCHAR(45) NULL,            -- IPv4 o IPv6
    user_agent TEXT NULL,                   -- User agent del navegador
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

**Ejecutar el script:**
```bash
mysql -u root -p electromarket2 < migrations/create_refresh_tokens_table.sql
```

---

## 🔧 Archivos Implementados

### 1. **`migrations/create_refresh_tokens_table.sql`**
Script SQL para crear la tabla de refresh tokens.

### 2. **`models/refreshTokenModel.js`**
Modelo para gestionar tokens en BD:
- `storeRefreshToken()` - Almacenar token
- `verifyRefreshToken()` - Verificar validez
- `revokeRefreshToken()` - Revocar token específico
- `revokeAllUserTokens()` - Revocar todos los tokens de un usuario
- `cleanupExpiredTokens()` - Limpiar tokens antiguos
- `getUserActiveTokens()` - Listar sesiones activas
- `getTokenStats()` - Estadísticas de tokens

### 3. **`services/tokenCleanupService.js`**
Servicio para limpieza automática de tokens:
- Ejecuta cada 24 horas por defecto
- Elimina tokens expirados con más de 30 días de antigüedad
- Muestra estadísticas en modo desarrollo

### 4. **`utils/authUtils.js`** (Actualizado)
- `generateRefreshToken()` ahora retorna `{ token, tokenId, expiresAt }`
- Calcula fecha de expiración automáticamente

### 5. **`controllers/authController.js`** (Actualizado)
- **Login**: Almacena refresh token en BD
- **Register**: Almacena refresh token en BD
- **RefreshToken**: Valida contra BD y rota token (revoca el anterior)
- **Logout**: Revoca el refresh token específico

### 6. **`server.js`** (Actualizado)
- Inicia el servicio de limpieza automática al arrancar

### 7. **`src/api/authApi.ts`** (Frontend - Actualizado)
- Envía refresh token en logout para revocación

---

## 🚀 Flujo de Autenticación

### 1️⃣ Login / Registro

```
Cliente                  Servidor                    Base de Datos
  |                        |                              |
  |-- POST /auth/login --> |                              |
  |                        |-- Verificar credenciales --> |
  |                        |                              |
  |                        |-- Generar tokens ----------> |
  |                        |                              |
  |                        |-- Almacenar refresh token -> |
  |                        |   (token_id, hash, expires)  |
  |                        |                              |
  |<-- { accessToken, }----|                              |
  |    refreshToken }      |                              |
```

**Backend:**
```javascript
// Generar tokens
const accessToken = generateAccessToken(user);
const refreshTokenData = generateRefreshToken(user);

// Almacenar refresh token
await RefreshTokenModel.storeRefreshToken({
    usuarioId: user.id,
    tokenId: refreshTokenData.tokenId,
    refreshToken: refreshTokenData.token,
    expiresAt: refreshTokenData.expiresAt,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
});

// Retornar tokens
return { accessToken, refreshToken: refreshTokenData.token };
```

---

### 2️⃣ Refresh Token (Rotación)

```
Cliente                  Servidor                    Base de Datos
  |                        |                              |
  |-- POST /auth/refresh ->|                              |
  |    { refreshToken }    |                              |
  |                        |-- Verificar JWT -----------> |
  |                        |                              |
  |                        |-- Verificar en BD ---------> |
  |                        |   (token_id, hash válidos?)  |
  |                        |                              |
  |                        |-- Revocar token anterior --> |
  |                        |   (rotación)                 |
  |                        |                              |
  |                        |-- Generar nuevos tokens ---> |
  |                        |                              |
  |                        |-- Almacenar nuevo token ---> |
  |                        |                              |
  |<-- { new tokens } -----|                              |
```

**Backend:**
```javascript
// Verificar refresh token
const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);
const tokenData = await RefreshTokenModel.verifyRefreshToken(
    decoded.tokenId, 
    refreshToken
);

if (!tokenData) {
    return error('Token inválido, expirado o revocado');
}

// Revocar token anterior (rotación)
await RefreshTokenModel.rotateRefreshToken(decoded.tokenId);

// Generar nuevos tokens
const newAccessToken = generateAccessToken(user);
const newRefreshTokenData = generateRefreshToken(user);

// Almacenar nuevo refresh token
await RefreshTokenModel.storeRefreshToken({ ... });
```

---

### 3️⃣ Logout Real

```
Cliente                  Servidor                    Base de Datos
  |                        |                              |
  |-- POST /auth/logout -> |                              |
  |    { refreshToken }    |                              |
  |                        |-- Decodificar token -------> |
  |                        |                              |
  |                        |-- Revocar token ------------> |
  |                        |   (revoked_at = NOW)         |
  |                        |                              |
  |<-- Logout exitoso -----|                              |
  |                        |                              |
  |-- Limpiar localStorage |                              |
```

**Backend:**
```javascript
static async logout(req, res) {
    const { refreshToken } = req.body;

    if (refreshToken) {
        const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);
        await RefreshTokenModel.revokeRefreshToken(
            decoded.tokenId, 
            'logout'
        );
    }

    return successResponse(res, null, 'Logout exitoso');
}
```

**Frontend:**
```typescript
public async logout(): Promise<void> {
    await axios.post('/auth/logout', {
        refreshToken: this.tokens.refreshToken
    });
    this.clearAuth();
}
```

---

## 🔒 Seguridad Implementada

### 1. **Hash de Tokens**
Los refresh tokens se almacenan hasheados (SHA-256) en BD:
```javascript
const tokenHash = crypto.createHash('sha256')
    .update(refreshToken)
    .digest('hex');
```

### 2. **Rotación de Tokens**
Al hacer refresh, el token anterior se revoca automáticamente:
```javascript
await RefreshTokenModel.rotateRefreshToken(oldTokenId, 'token_rotation');
```

### 3. **Validación Múltiple**
Un token es válido solo si:
- ✅ JWT es válido
- ✅ Existe en BD
- ✅ No está revocado (`revoked_at IS NULL`)
- ✅ No está expirado (`expires_at > NOW()`)
- ✅ El usuario está activo

### 4. **Auditoría**
Cada token almacena:
- IP del cliente
- User-Agent del navegador
- Fecha de creación
- Razón de revocación

### 5. **Limpieza Automática**
Tokens expirados se eliminan periódicamente:
```javascript
TokenCleanupService.start(24, 30); // Cada 24h, tokens > 30 días
```

---

## 📚 API de Endpoints

### POST `/api/auth/login`
Inicia sesión y retorna tokens.

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": "24h"
    }
  }
}
```

---

### POST `/api/auth/refresh`
Renueva los tokens (rota el refresh token).

**Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": "24h"
    }
  }
}
```

---

### POST `/api/auth/logout`
Invalida el refresh token.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout exitoso"
}
```

---

## 🛠️ Uso del Modelo

### Revocar todos los tokens de un usuario
```javascript
await RefreshTokenModel.revokeAllUserTokens(userId, 'security_breach');
```

### Listar sesiones activas
```javascript
const sessions = await RefreshTokenModel.getUserActiveTokens(userId);
// Retorna array con IP, User-Agent, fecha de creación
```

### Obtener estadísticas
```javascript
const stats = await RefreshTokenModel.getTokenStats();
// {
//   total_tokens: 150,
//   active_tokens: 42,
//   revoked_tokens: 85,
//   expired_tokens: 23,
//   users_with_tokens: 38
// }
```

### Limpieza manual
```javascript
const deleted = await RefreshTokenModel.cleanupExpiredTokens(30);
console.log(`Eliminados ${deleted} tokens`);
```

---

## 🎯 Casos de Uso Avanzados

### 1. **Logout de todas las sesiones**
```javascript
// En authController.js, método logout:
await RefreshTokenModel.revokeAllUserTokens(req.user.id, 'logout_all');
```

### 2. **Suspender usuario (revocar todas sus sesiones)**
```javascript
// En userController.js:
await RefreshTokenModel.revokeAllUserTokens(userId, 'user_suspended');
await UserModel.updateUserStatus(userId, 'suspendido');
```

### 3. **Detectar sesiones sospechosas**
```javascript
const sessions = await RefreshTokenModel.getUserActiveTokens(userId);
sessions.forEach(session => {
    console.log(`Sesión desde ${session.ip_address} - ${session.user_agent}`);
});
```

### 4. **Limitar sesiones concurrentes**
```javascript
const activeCount = await RefreshTokenModel.countUserActiveTokens(userId);
if (activeCount >= 5) {
    return error('Máximo de sesiones alcanzado');
}
```

---

## 📊 Monitoreo

### Ver estadísticas en desarrollo
El servicio de limpieza muestra estadísticas automáticamente en modo desarrollo:

```
🧹 Ejecutando limpieza de tokens expirados (> 30 días)...
✅ Limpieza completada: 15 tokens eliminados
📊 Estadísticas de tokens: {
  activos: 42,
  revocados: 85,
  expirados: 8,
  total: 135
}
```

### Consultar estadísticas manualmente
```javascript
const stats = await RefreshTokenModel.getTokenStats();
```

---

## 🔧 Configuración

### Variables de Entorno

```env
# Refresh token secret (debe ser diferente de JWT_SECRET)
JWT_REFRESH_SECRET=tu_refresh_secret_diferente_aqui_minimo_32_caracteres

# Expiración del refresh token
JWT_REFRESH_EXPIRES_IN=7d
```

### Personalizar limpieza automática

En `server.js`:
```javascript
// Limpiar cada 12 horas, tokens con más de 7 días
TokenCleanupService.start(12, 7);

// Detener el servicio
TokenCleanupService.stop();

// Verificar estado
console.log(TokenCleanupService.isServiceRunning());
```

---

## ⚠️ Consideraciones de Seguridad

### ✅ Implementado
- [x] Tokens hasheados en BD
- [x] Rotación automática de tokens
- [x] Validación múltiple (JWT + BD + estado usuario)
- [x] Auditoría con IP y User-Agent
- [x] Limpieza automática de tokens expirados
- [x] Revocación individual y masiva

### 🔄 Opcional (Mejoras futuras)
- [ ] Lista negra de access tokens (requiere Redis)
- [ ] Notificaciones de nuevas sesiones
- [ ] Límite de sesiones concurrentes por usuario
- [ ] Geolocalización de IPs
- [ ] Detección de sesiones sospechosas

---

## 🐛 Troubleshooting

### Error: "Refresh token inválido, expirado o revocado"
**Causas:**
1. Token no existe en BD
2. Token fue revocado
3. Token expiró
4. Usuario está inactivo

**Solución:**
Hacer login nuevamente.

### Error: "Token rotation failed"
**Causa:** El token anterior ya fue usado (posible ataque de replay).

**Solución:**
Hacer login nuevamente y reportar actividad sospechosa.

### Muchos tokens acumulados en BD
**Causa:** Servicio de limpieza no ejecutándose.

**Solución:**
```javascript
await RefreshTokenModel.cleanupExpiredTokens(30);
```

---

## 🎉 Beneficios

1. **Logout Real**: Los tokens se invalidan inmediatamente en el servidor
2. **Seguridad Mejorada**: Protección contra robo de tokens
3. **Rotación Automática**: Reduce el riesgo de ataques de replay
4. **Auditoría**: Registro completo de sesiones y revocaciones
5. **Gestión de Sesiones**: Control total sobre las sesiones activas
6. **Escalabilidad**: Base de datos optimizada con índices

---

## 📝 Próximos Pasos Recomendados

1. ✅ Implementar endpoint para listar sesiones activas del usuario
2. ✅ Agregar endpoint para revocar sesión específica
3. ✅ Implementar límite de sesiones concurrentes
4. ✅ Agregar notificaciones de nuevas sesiones
5. ✅ Implementar detección de sesiones anómalas

---

## 📚 Referencias

- [RFC 7519: JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [OWASP Token Binding](https://owasp.org/www-community/controls/Token_Binding)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

**Implementado por:** Sistema de Autenticación JWT - ElectroMarket  
**Fecha:** Octubre 2025  
**Versión:** 2.0

