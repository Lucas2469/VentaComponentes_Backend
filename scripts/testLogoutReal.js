/**
 * Script de prueba para el sistema de Logout Real
 * Demuestra el funcionamiento de la gestión de refresh tokens
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const TEST_USER = {
    email: 'test@example.com',
    password: 'TestPassword123!'
};

let tokens = null;
let userId = null;

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.cyan}🔹 ${msg}${colors.reset}\n`)
};

/**
 * Paso 1: Login
 */
async function testLogin() {
    log.step('PASO 1: Login de usuario');
    
    try {
        const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
        
        if (response.data.success) {
            tokens = response.data.data.tokens;
            userId = response.data.data.user.id;
            
            log.success('Login exitoso');
            log.info(`User ID: ${userId}`);
            log.info(`Access Token: ${tokens.accessToken.substring(0, 30)}...`);
            log.info(`Refresh Token: ${tokens.refreshToken.substring(0, 30)}...`);
            return true;
        }
    } catch (error) {
        log.error(`Error en login: ${error.response?.data?.error || error.message}`);
        return false;
    }
}

/**
 * Paso 2: Verificar token
 */
async function testVerifyToken() {
    log.step('PASO 2: Verificar access token');
    
    try {
        const response = await axios.get(`${API_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${tokens.accessToken}` }
        });
        
        if (response.data.success) {
            log.success('Token válido');
            log.info(`Usuario: ${response.data.data.user.nombre} ${response.data.data.user.apellido}`);
            return true;
        }
    } catch (error) {
        log.error(`Error verificando token: ${error.response?.data?.error || error.message}`);
        return false;
    }
}

/**
 * Paso 3: Refresh token
 */
async function testRefreshToken() {
    log.step('PASO 3: Renovar tokens (Rotación)');
    
    const oldRefreshToken = tokens.refreshToken;
    
    try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken
        });
        
        if (response.data.success) {
            tokens = response.data.data.tokens;
            
            log.success('Tokens renovados exitosamente');
            log.info('Nuevo access token generado');
            log.info('Nuevo refresh token generado');
            log.info('Refresh token anterior revocado (rotación)');
            
            // Intentar usar el refresh token anterior (debe fallar)
            log.warning('Intentando usar el refresh token anterior...');
            
            try {
                await axios.post(`${API_URL}/auth/refresh`, {
                    refreshToken: oldRefreshToken
                });
                log.error('⚠️  ERROR: El token anterior NO fue revocado!');
                return false;
            } catch (error) {
                log.success('El token anterior fue correctamente revocado');
                return true;
            }
        }
    } catch (error) {
        log.error(`Error renovando tokens: ${error.response?.data?.error || error.message}`);
        return false;
    }
}

/**
 * Paso 4: Logout real
 */
async function testLogout() {
    log.step('PASO 4: Logout real (Revocar refresh token)');
    
    try {
        const response = await axios.post(`${API_URL}/auth/logout`, {
            refreshToken: tokens.refreshToken
        }, {
            headers: { Authorization: `Bearer ${tokens.accessToken}` }
        });
        
        if (response.data.success) {
            log.success('Logout exitoso');
            log.info('Refresh token revocado en base de datos');
            return true;
        }
    } catch (error) {
        log.error(`Error en logout: ${error.response?.data?.error || error.message}`);
        return false;
    }
}

/**
 * Paso 5: Intentar usar el token revocado
 */
async function testRevokedToken() {
    log.step('PASO 5: Intentar usar refresh token revocado');
    
    try {
        await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken
        });
        
        log.error('⚠️  ERROR: Token revocado aún funciona!');
        return false;
    } catch (error) {
        if (error.response?.status === 401) {
            log.success('Token revocado correctamente rechazado');
            log.info('Error recibido: ' + error.response.data.error);
            return true;
        }
        
        log.error(`Error inesperado: ${error.message}`);
        return false;
    }
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 PRUEBA DE LOGOUT REAL Y GESTIÓN DE REFRESH TOKENS');
    console.log('='.repeat(60) + '\n');
    
    const results = {
        login: false,
        verify: false,
        refresh: false,
        logout: false,
        revoked: false
    };
    
    // Ejecutar pruebas secuencialmente
    results.login = await testLogin();
    if (!results.login) {
        log.error('Login falló. Verifica que el usuario existe y el servidor está corriendo.');
        log.info('Puedes crear el usuario con: POST /api/auth/register');
        return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    results.verify = await testVerifyToken();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    results.refresh = await testRefreshToken();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    results.logout = await testLogout();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    results.revoked = await testRevokedToken();
    
    // Resumen de resultados
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('='.repeat(60) + '\n');
    
    const tests = [
        { name: 'Login', result: results.login },
        { name: 'Verificar Token', result: results.verify },
        { name: 'Refresh & Rotación', result: results.refresh },
        { name: 'Logout Real', result: results.logout },
        { name: 'Token Revocado', result: results.revoked }
    ];
    
    tests.forEach(test => {
        if (test.result) {
            log.success(`${test.name}: PASSED`);
        } else {
            log.error(`${test.name}: FAILED`);
        }
    });
    
    const passed = tests.filter(t => t.result).length;
    const total = tests.length;
    
    console.log('\n' + '='.repeat(60));
    if (passed === total) {
        log.success(`TODAS LAS PRUEBAS PASARON (${passed}/${total})`);
        console.log('\n✨ El sistema de logout real está funcionando correctamente!');
    } else {
        log.warning(`ALGUNAS PRUEBAS FALLARON (${passed}/${total})`);
        console.log('\n⚠️  Revisa la implementación y la configuración.');
    }
    console.log('='.repeat(60) + '\n');
}

// Ejecutar pruebas
runAllTests().catch(error => {
    console.error('\n❌ Error fatal en las pruebas:', error.message);
    process.exit(1);
});

