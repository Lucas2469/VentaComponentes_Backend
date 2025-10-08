# 🔐 Sistema de Autenticación JWT - ElectroMarket

## 📋 Resumen

Se ha implementado un sistema de autenticación completo y seguro usando JWT (JSON Web Tokens) y bcrypt para el hash de contraseñas.

## 🚀 Características Implementadas

### ✅ Seguridad
- **JWT Tokens**: Access tokens (24h) y refresh tokens (7d)
- **Bcrypt**: Hash seguro de contraseñas con salt rounds configurables
- **Rate Limiting**: Protección contra ataques de fuerza bruta
- **Helmet**: Headers de seguridad HTTP
- **CORS**: Configuración segura de orígenes permitidos
- **Validación**: Sanitización de inputs y validación de datos

### ✅ Endpoints de Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/refresh` - Renovar tokens
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/change-password` - Cambiar contraseña
- `GET /api/auth/verify` - Verificar token

### ✅ Middleware de Protección
- `authenticateToken` - Verificar JWT
- `requireAdmin` - Solo administradores
- `requireVendorOrAdmin` - Vendedores o admins
- `requireOwnershipOrAdmin` - Propietario o admin
- `preventSelfAction` - Evitar acciones sobre sí mismo
- `requireProductOwnership` - Propietario del producto

## 🔧 Configuración

### Variables de Entorno Requeridas

```env
# JWT Configuration
JWT_SECRET=tu_jwt_secret_super_seguro_aqui_minimo_32_caracteres
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=tu_refresh_secret_diferente_aqui_minimo_32_caracteres
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
NODE_ENV=development
```

### Instalación de Dependencias

```bash
npm install jsonwebtoken bcrypt express-rate-limit helmet
```

## 📚 Uso de la API

### 1. Registro de Usuario

```javascript
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "telefono": "12345678",
  "password": "MiPassword123!",
  "tipo_usuario": "comprador"
}
```

**Respuesta:**
```javascript
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan",
      "apellido": "Pérez",
      "email": "juan@example.com",
      "tipo_usuario": "comprador",
      "creditos_disponibles": 0
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "24h"
    }
  }
}
```

### 2. Login

```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "MiPassword123!"
}
```

### 3. Usar Token en Requests

```javascript
GET /api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Renovar Token

```javascript
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🛡️ Validaciones de Contraseña

Las contraseñas deben cumplir:
- ✅ Mínimo 8 caracteres
- ✅ Máximo 128 caracteres
- ✅ Al menos una letra minúscula
- ✅ Al menos una letra mayúscula
- ✅ Al menos un número
- ✅ Al menos un carácter especial
- ✅ No ser contraseñas comunes

## 🔄 Migración de Contraseñas Existentes

Para migrar contraseñas SHA2 a bcrypt:

```bash
node scripts/migratePasswords.js
```

**⚠️ Importante:** Los usuarios migrados recibirán contraseñas temporales y deben cambiarlas en el próximo login.

## 🚦 Rate Limiting

- **Login/Register**: 5 intentos por 15 minutos
- **API General**: 100 requests por 15 minutos
- **Cambio de contraseña**: 3 intentos por 5 minutos

## 🔒 Rutas Protegidas

### Solo Administradores
- `GET /api/users` - Listar usuarios
- `GET /api/users/search` - Buscar usuarios
- `PUT /api/users/:id/status` - Cambiar estado de usuario

### Usuario Propietario o Admin
- `GET /api/users/:id` - Ver perfil
- `PUT /api/users/:id` - Actualizar perfil
- `PUT /api/users/:id/change-password` - Cambiar contraseña

### Vendedores o Admins
- Rutas de productos (implementar según necesidad)

## 🐛 Debugging

### Verificar Token
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/auth/verify
```

### Logs de Autenticación
Los logs incluyen:
- Requests con IP y User-Agent
- Errores de autenticación
- Rate limiting activado

## 🔧 Personalización

### Cambiar Tiempo de Expiración
```env
JWT_EXPIRES_IN=1h        # Access token por 1 hora
JWT_REFRESH_EXPIRES_IN=30d  # Refresh token por 30 días
```

### Ajustar Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=300000    # 5 minutos
RATE_LIMIT_MAX_REQUESTS=50     # 50 requests
```

### Cambiar Rounds de Bcrypt
```env
BCRYPT_ROUNDS=14  # Más seguro pero más lento
```

## 🚨 Consideraciones de Seguridad

1. **JWT Secret**: Debe ser único y complejo (mínimo 32 caracteres)
2. **HTTPS**: Usar siempre en producción
3. **Refresh Tokens**: Implementar blacklist en producción
4. **Logs**: No loggear contraseñas o tokens
5. **Variables de Entorno**: Nunca commitear archivos .env

## 📝 Próximos Pasos

1. ✅ Implementar sistema de reset de contraseña
2. ✅ Agregar verificación de email
3. ✅ Implementar 2FA (Two-Factor Authentication)
4. ✅ Agregar auditoría de login
5. ✅ Implementar blacklist de tokens

## 🆘 Troubleshooting

### Error: "Token inválido"
- Verificar que el token esté en el header `Authorization: Bearer TOKEN`
- Verificar que el JWT_SECRET sea correcto
- Verificar que el token no haya expirado

### Error: "Usuario no encontrado"
- Verificar que el usuario exista en la base de datos
- Verificar que el usuario esté activo

### Error: "Rate limit exceeded"
- Esperar el tiempo de ventana configurado
- Verificar configuración de rate limiting

---

**🎉 ¡Sistema de autenticación implementado exitosamente!**

Para más información, consulta los archivos:
- `middleware/auth.js` - Middleware de autenticación
- `controllers/authController.js` - Controlador de autenticación
- `utils/authUtils.js` - Utilidades JWT y bcrypt
- `middleware/security.js` - Middleware de seguridad
