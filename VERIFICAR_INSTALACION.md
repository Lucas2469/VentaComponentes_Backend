# ✅ Verificación de Instalación - Logout Real

## 🎯 Pasos Completados Automáticamente

### ✅ 1. Código Implementado
- ✅ RefreshTokenModel creado
- ✅ TokenCleanupService creado
- ✅ AuthController actualizado
- ✅ AuthUtils actualizado
- ✅ Server.js configurado
- ✅ Frontend actualizado

---

## 📋 Pasos que DEBES hacer Manualmente

### 🔴 PASO 1: Crear la Tabla en Base de Datos

**Opción A - MySQL Workbench:**
1. Abre MySQL Workbench
2. Conéctate a tu base de datos `electromarket2`
3. Abre el archivo: `EJECUTAR_ESTE_SQL.sql`
4. Click en el botón ⚡ (ejecutar)

**Opción B - phpMyAdmin:**
1. Abre phpMyAdmin
2. Selecciona la base de datos `electromarket2`
3. Click en "SQL"
4. Copia y pega el contenido de: `EJECUTAR_ESTE_SQL.sql`
5. Click en "Continuar"

**Opción C - Línea de comandos (si tienes MySQL en PATH):**
```bash
# Encuentra la ruta de mysql.exe, por ejemplo:
# C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe

"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p electromarket2 < EJECUTAR_ESTE_SQL.sql
```

**Verificación:**
```sql
USE electromarket2;
SHOW TABLES LIKE 'refresh_tokens';
-- Debe mostrar la tabla
```

---

### 🟡 PASO 2: Verificar Variables de Entorno

Abre el archivo `.env` en `VentaComponentes_Backend/.env` y verifica que tenga:

```env
# IMPORTANTE: Estos dos valores DEBEN SER DIFERENTES
JWT_SECRET=tu_jwt_secret_super_seguro_aqui_minimo_32_caracteres
JWT_REFRESH_SECRET=tu_refresh_secret_diferente_aqui_minimo_32_caracteres

JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

**Si no tienes archivo .env:**
1. Copia `env.example` a `.env`
2. Edita los valores de `JWT_SECRET` y `JWT_REFRESH_SECRET`
3. Asegúrate de que sean diferentes entre sí

**Generar secrets seguros (opcional):**
```javascript
// En Node.js:
require('crypto').randomBytes(32).toString('hex')
```

---

### 🟢 PASO 3: Reiniciar el Servidor

```bash
# En la terminal de VentaComponentes_Backend:
npm start

# O en modo desarrollo:
npm run dev
```

**Debes ver estos mensajes:**
```
🚀 Servidor ejecutándose en puerto 5000
🔐 Autenticación API: http://localhost:5000/api/auth
🧹 Iniciando servicio de limpieza de tokens (cada 24h, tokens > 30 días)
```

---

## 🧪 Pruebas

### Prueba 1: Verificar que el servidor inicia
```bash
npm start
```
✅ Debe iniciar sin errores

### Prueba 2: Ejecutar script de pruebas
```bash
node scripts/testLogoutReal.js
```
✅ Todas las pruebas deben pasar

### Prueba 3: Probar manualmente
1. **Login:**
   ```http
   POST http://localhost:5000/api/auth/login
   Content-Type: application/json

   {
     "email": "tu_email@example.com",
     "password": "tu_password"
   }
   ```

2. **Verificar en BD:**
   ```sql
   SELECT * FROM refresh_tokens ORDER BY created_at DESC LIMIT 1;
   ```
   ✅ Debe aparecer el token

3. **Logout:**
   ```http
   POST http://localhost:5000/api/auth/logout
   Authorization: Bearer {tu_access_token}
   Content-Type: application/json

   {
     "refreshToken": "{tu_refresh_token}"
   }
   ```

4. **Verificar revocación:**
   ```sql
   SELECT revoked_at, revoked_reason FROM refresh_tokens ORDER BY created_at DESC LIMIT 1;
   ```
   ✅ `revoked_at` debe tener una fecha

---

## ✅ Checklist Final

```
☐ 1. Ejecuté el archivo EJECUTAR_ESTE_SQL.sql en MySQL
☐ 2. Verifiqué que la tabla refresh_tokens existe
☐ 3. Revisé el archivo .env y los JWT secrets son diferentes
☐ 4. Reinicié el servidor con npm start
☐ 5. Vi el mensaje de "limpieza de tokens" en consola
☐ 6. Probé hacer login y vi el token en la BD
☐ 7. Probé hacer logout y vi el token revocado
```

---

## 🎉 ¡Todo Listo!

Una vez completes estos 3 pasos, el sistema de logout real estará **100% funcional**.

---

## 🆘 Problemas Comunes

### "Table 'refresh_tokens' doesn't exist"
→ No ejecutaste el SQL. Abre `EJECUTAR_ESTE_SQL.sql` en MySQL Workbench.

### "Cannot start server"
→ Revisa que el archivo `.env` existe y tiene los valores correctos.

### "All tests failed"
→ Verifica que:
1. La tabla existe en BD
2. El servidor está corriendo
3. Tienes un usuario registrado para las pruebas

---

## 📚 Documentación

- **Guía Rápida:** `INSTRUCCIONES_RAPIDAS.md`
- **Guía Completa:** `INSTALACION_LOGOUT_REAL.md`
- **Documentación Técnica:** `LOGOUT_REAL_README.md`

---

**Implementación completada por IA - Octubre 2025**

