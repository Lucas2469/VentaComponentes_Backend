/**
 * Script para migrar contraseñas de SHA2 a bcrypt
 * Ejecutar una sola vez después de implementar el sistema de autenticación
 */

require('dotenv').config();
const db = require('../database');
const { hashPassword } = require('../utils/authUtils');

async function migratePasswords() {
    console.log('🔄 Iniciando migración de contraseñas...');
    
    try {
        // Obtener todos los usuarios con contraseñas SHA2
        const [users] = await db.execute(`
            SELECT id, email, password_hash 
            FROM usuarios 
            WHERE password_hash IS NOT NULL 
            AND password_hash != ''
        `);
        
        console.log(`📊 Encontrados ${users.length} usuarios para migrar`);
        
        let migrated = 0;
        let errors = 0;
        
        for (const user of users) {
            try {
                // Verificar si ya es un hash bcrypt (empieza con $2b$)
                if (user.password_hash.startsWith('$2b$')) {
                    console.log(`⏭️  Usuario ${user.email} ya tiene contraseña bcrypt, saltando...`);
                    continue;
                }
                
                // Para usuarios existentes, necesitamos una contraseña temporal
                // En producción, deberías pedir al usuario que resetee su contraseña
                const tempPassword = `temp_${user.id}_${Date.now()}`;
                const hashedPassword = await hashPassword(tempPassword);
                
                // Actualizar la contraseña
                await db.execute(
                    'UPDATE usuarios SET password_hash = ? WHERE id = ?',
                    [hashedPassword, user.id]
                );
                
                console.log(`✅ Usuario ${user.email} migrado (ID: ${user.id})`);
                console.log(`   Contraseña temporal: ${tempPassword}`);
                console.log(`   ⚠️  IMPORTANTE: El usuario debe cambiar su contraseña en el próximo login`);
                
                migrated++;
                
            } catch (error) {
                console.error(`❌ Error migrando usuario ${user.email}:`, error.message);
                errors++;
            }
        }
        
        console.log('\n📈 Resumen de migración:');
        console.log(`✅ Usuarios migrados: ${migrated}`);
        console.log(`❌ Errores: ${errors}`);
        console.log(`📊 Total procesados: ${users.length}`);
        
        if (migrated > 0) {
            console.log('\n⚠️  IMPORTANTE:');
            console.log('1. Los usuarios migrados tienen contraseñas temporales');
            console.log('2. Deben cambiar su contraseña en el próximo login');
            console.log('3. Considera enviar emails de notificación');
            console.log('4. En producción, implementa un sistema de reset de contraseña');
        }
        
    } catch (error) {
        console.error('💥 Error en la migración:', error);
    } finally {
        // Cerrar conexión
        await db.end();
        console.log('🔚 Migración completada');
        process.exit(0);
    }
}

// Ejecutar migración
migratePasswords();
