# 🚀 Instalación del Sistema de Logout Real

## ✅ Checklist de Implementación

### Paso 1: Ejecutar el Script SQL ⚠️ **IMPORTANTE**

Debes crear la tabla `refresh_tokens` en tu base de datos:

```bash
# Opción 1: Desde la terminal
mysql -u root -p electromarket2 < migrations/create_refresh_tokens_table.sql

# Opción 2: Desde MySQL Workbench o phpMyAdmin
# Copia y ejecuta el contenido de: migrations/create_refresh_tokens_table.sql
```

**Verifica que la tabla se creó correctamente:**
```sql
USE electromarket2;
SHOW TABLES LIKE 'refresh_tokens';
DESCRIBE refresh_tokens;
```

---

### Paso 2: Verificar Configuración de Variables de Entorno

Asegúrate de que tu archivo `.env` tenga:

```env
# JWT Secrets (DEBEN SER DIFERENTES)
JWT_SECRET=tu_jwt_secret_super_seguro_aqui_minimo_32_caracteres
JWT_REFRESH_SECRET=tu_refresh_secret_diferente_aqui_minimo_32_caracteres

# Expiraciones
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

⚠️ **IMPORTANTE**: `JWT_SECRET` y `JWT_REFRESH_SECRET` deben ser diferentes.

---

### Paso 3: Instalar Dependencias (Ya Instaladas)

Las dependencias ya están en `package.json`:
- ✅ `jsonwebtoken`
- ✅ `bcrypt`
- ✅ `express-rate-limit`
- ✅ `helmet`

Si instalaste el proyecto desde cero:
```bash
npm install
```

---

### Paso 4: Reiniciar el Servidor

```bash
# Detener el servidor actual (Ctrl + C)

# Iniciar nuevamente
npm start

# O en modo desarrollo
npm run dev
```

**Verás estos mensajes:**
```
🚀 Servidor ejecutándose en puerto 5000
🧹 Iniciando servicio de limpieza de tokens (cada 24h, tokens > 30 días)
```

---

### Paso 5: Probar el Sistema

#### Opción A: Usar el Script de Prueba

```bash
node scripts/testLogoutReal.js
```

**Nota:** Necesitas tener un usuario de prueba registrado con:
- Email: `test@example.com`
- Password: `TestPassword123!`

O edita el script con tus credenciales.

#### Opción B: Probar Manualmente con Postman/Insomnia

**1. Login:**
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "tu_email@example.com",
  "password": "tu_password"
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
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**2. Verificar token en BD:**
```sql
SELECT * FROM refresh_tokens WHERE usuario_id = [TU_USER_ID];
```

Deberías ver un registro con el token hasheado.

**3. Logout:**
```http
POST http://localhost:5000/api/auth/logout
Authorization: Bearer {tu_access_token}
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**4. Verificar revocación:**
```sql
SELECT * FROM refresh_tokens WHERE usuario_id = [TU_USER_ID];
```

El campo `revoked_at` debe tener una fecha/hora.

**5. Intentar usar el token revocado:**
```http
POST http://localhost:5000/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

Debe retornar error 401: "Refresh token inválido, expirado o revocado"

---

## 🔍 Verificación del Sistema

### 1. Verificar tabla en BD

```sql
USE electromarket2;

-- Ver estructura
DESCRIBE refresh_tokens;

-- Ver todos los tokens
SELECT 
    id,
    usuario_id,
    token_id,
    expires_at,
    created_at,
    revoked_at,
    revoked_reason,
    ip_address
FROM refresh_tokens
ORDER BY created_at DESC;

-- Ver solo tokens activos
SELECT COUNT(*) as activos 
FROM refresh_tokens 
WHERE revoked_at IS NULL 
  AND expires_at > NOW();

-- Ver tokens revocados
SELECT COUNT(*) as revocados 
FROM refresh_tokens 
WHERE revoked_at IS NOT NULL;
```

### 2. Verificar servicio de limpieza

El servicio debe ejecutarse automáticamente cada 24 horas. Verás en la consola:

```
🧹 Ejecutando limpieza de tokens expirados (> 30 días)...
✅ Limpieza completada: X tokens eliminados
```

Para forzar una limpieza manual:
```javascript
const RefreshTokenModel = require('./models/refreshTokenModel');
await RefreshTokenModel.cleanupExpiredTokens(30);
```

---

## 🎯 Funcionalidades Implementadas

### ✅ Login
- Genera access token y refresh token
- Almacena refresh token hasheado en BD
- Registra IP y User-Agent

### ✅ Refresh Token
- Valida token contra BD
- Revoca token anterior (rotación)
- Genera nuevos tokens
- Almacena nuevo refresh token

### ✅ Logout
- Revoca el refresh token específico
- Marca `revoked_at` con fecha actual
- Frontend limpia localStorage

### ✅ Limpieza Automática
- Ejecuta cada 24 horas por defecto
- Elimina tokens expirados > 30 días
- Muestra estadísticas en desarrollo

---

## 🐛 Solución de Problemas

### Error: "Cannot find module 'RefreshTokenModel'"

**Solución:**
Verifica que el archivo existe:
```bash
ls -la models/refreshTokenModel.js
```

### Error: "Table 'refresh_tokens' doesn't exist"

**Solución:**
Ejecuta el script SQL:
```bash
mysql -u root -p electromarket2 < migrations/create_refresh_tokens_table.sql
```

### Error: "Refresh token inválido, expirado o revocado"

**Causas posibles:**
1. Token ya fue usado (rotación funcionando correctamente)
2. Token fue revocado en logout
3. Token expiró (> 7 días)
4. Usuario está inactivo

**Solución:**
Hacer login nuevamente.

### Tokens no se están revocando

**Verificación:**
```sql
SELECT revoked_at, revoked_reason 
FROM refresh_tokens 
WHERE usuario_id = [TU_USER_ID];
```

Si `revoked_at` es NULL después de logout, revisa:
1. Que el frontend está enviando `refreshToken` en el body
2. Que el backend está procesando correctamente el logout

### Servicio de limpieza no funciona

**Verificación:**
```javascript
// En consola de Node.js
const TokenCleanupService = require('./services/tokenCleanupService');
console.log(TokenCleanupService.isServiceRunning()); // Debe ser true
```

---

## 📊 Monitoreo y Estadísticas

### Ver estadísticas generales

```javascript
const RefreshTokenModel = require('./models/refreshTokenModel');

const stats = await RefreshTokenModel.getTokenStats();
console.log(stats);
// {
//   total_tokens: 150,
//   active_tokens: 42,
//   revoked_tokens: 85,
//   expired_tokens: 23,
//   users_with_tokens: 38
// }
```

### Ver sesiones de un usuario

```javascript
const sessions = await RefreshTokenModel.getUserActiveTokens(userId);
console.table(sessions);
```

---

## 🎉 Confirmación de Instalación Exitosa

Si todo está funcionando correctamente, deberías poder:

1. ✅ Hacer login y recibir tokens
2. ✅ Ver el token en la tabla `refresh_tokens`
3. ✅ Renovar tokens (refresh) y ver que el anterior se revoca
4. ✅ Hacer logout y ver `revoked_at` actualizado
5. ✅ Intentar usar un token revocado y recibir error 401
6. ✅ Ver mensajes de limpieza automática cada 24h

---

## 📚 Documentación Adicional

- **Uso completo del sistema:** Ver `LOGOUT_REAL_README.md`
- **Documentación de autenticación:** Ver `AUTH_README.md`
- **Modelo de tokens:** Ver `models/refreshTokenModel.js`

---

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs del servidor
2. Verifica la tabla `refresh_tokens` en BD
3. Ejecuta el script de prueba: `node scripts/testLogoutReal.js`
4. Revisa las queries SQL de verificación
5. Compara tu implementación con `LOGOUT_REAL_README.md`

---

**¡Listo!** 🎊 El sistema de logout real está instalado y funcionando.

