/**
 * Script para probar el sistema de autenticación
 * Ejecutar después de implementar el sistema JWT
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Colores para console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, 'green');
const logError = (message) => log(`❌ ${message}`, 'red');
const logWarning = (message) => log(`⚠️  ${message}`, 'yellow');
const logInfo = (message) => log(`ℹ️  ${message}`, 'blue');
const logHeader = (message) => log(`\n${colors.bold}${message}${colors.reset}`, 'blue');

// Datos de prueba
const testUser = {
  nombre: 'Usuario',
  apellido: 'Prueba',
  email: 'test@electromarket.bo',
  telefono: '12345678',
  password: 'TestPassword123!',
  tipo_usuario: 'comprador'
};

const testLogin = {
  email: 'test@electromarket.bo',
  password: 'TestPassword123!'
};

let authTokens = null;

// Función para hacer requests con manejo de errores
const makeRequest = async (method, url, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

// Test 1: Registro de usuario
async function testRegister() {
  logHeader('🧪 TEST 1: Registro de Usuario');
  
  const result = await makeRequest('POST', '/auth/register', testUser);
  
  if (result.success) {
    logSuccess('Usuario registrado exitosamente');
    logInfo(`ID: ${result.data.data.user.id}`);
    logInfo(`Email: ${result.data.data.user.email}`);
    logInfo(`Tipo: ${result.data.data.user.tipo_usuario}`);
    return true;
  } else {
    if (result.status === 409) {
      logWarning('Usuario ya existe, continuando con login...');
      return true;
    } else {
      logError(`Error en registro: ${JSON.stringify(result.error)}`);
      return false;
    }
  }
}

// Test 2: Login de usuario
async function testLogin() {
  logHeader('🧪 TEST 2: Login de Usuario');
  
  const result = await makeRequest('POST', '/auth/login', testLogin);
  
  if (result.success) {
    logSuccess('Login exitoso');
    authTokens = result.data.data.tokens;
    logInfo(`Access Token: ${authTokens.accessToken.substring(0, 50)}...`);
    logInfo(`Refresh Token: ${authTokens.refreshToken.substring(0, 50)}...`);
    logInfo(`Expires In: ${authTokens.expiresIn}`);
    return true;
  } else {
    logError(`Error en login: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Test 3: Verificar token
async function testVerifyToken() {
  logHeader('🧪 TEST 3: Verificar Token');
  
  if (!authTokens) {
    logError('No hay tokens disponibles');
    return false;
  }
  
  const result = await makeRequest('GET', '/auth/verify', null, {
    'Authorization': `Bearer ${authTokens.accessToken}`
  });
  
  if (result.success) {
    logSuccess('Token válido');
    logInfo(`Usuario: ${result.data.data.user.email}`);
    logInfo(`Rol: ${result.data.data.user.tipo_usuario}`);
    return true;
  } else {
    logError(`Error verificando token: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Test 4: Obtener perfil
async function testGetProfile() {
  logHeader('🧪 TEST 4: Obtener Perfil');
  
  if (!authTokens) {
    logError('No hay tokens disponibles');
    return false;
  }
  
  const result = await makeRequest('GET', '/auth/profile', null, {
    'Authorization': `Bearer ${authTokens.accessToken}`
  });
  
  if (result.success) {
    logSuccess('Perfil obtenido exitosamente');
    logInfo(`Nombre: ${result.data.data.nombre} ${result.data.data.apellido}`);
    logInfo(`Email: ${result.data.data.email}`);
    logInfo(`Créditos: ${result.data.data.creditos_disponibles}`);
    return true;
  } else {
    logError(`Error obteniendo perfil: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Test 5: Refresh token
async function testRefreshToken() {
  logHeader('🧪 TEST 5: Refresh Token');
  
  if (!authTokens) {
    logError('No hay tokens disponibles');
    return false;
  }
  
  const result = await makeRequest('POST', '/auth/refresh', {
    refreshToken: authTokens.refreshToken
  });
  
  if (result.success) {
    logSuccess('Token refrescado exitosamente');
    authTokens = result.data.data.tokens;
    logInfo(`Nuevo Access Token: ${authTokens.accessToken.substring(0, 50)}...`);
    return true;
  } else {
    logError(`Error refrescando token: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Test 6: Cambiar contraseña
async function testChangePassword() {
  logHeader('🧪 TEST 6: Cambiar Contraseña');
  
  if (!authTokens) {
    logError('No hay tokens disponibles');
    return false;
  }
  
  const newPassword = 'NewTestPassword123!';
  const result = await makeRequest('PUT', '/auth/change-password', {
    currentPassword: testLogin.password,
    newPassword: newPassword
  }, {
    'Authorization': `Bearer ${authTokens.accessToken}`
  });
  
  if (result.success) {
    logSuccess('Contraseña cambiada exitosamente');
    // Actualizar la contraseña para futuras pruebas
    testLogin.password = newPassword;
    return true;
  } else {
    logError(`Error cambiando contraseña: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Test 7: Acceso a ruta protegida
async function testProtectedRoute() {
  logHeader('🧪 TEST 7: Acceso a Ruta Protegida');
  
  if (!authTokens) {
    logError('No hay tokens disponibles');
    return false;
  }
  
  const result = await makeRequest('GET', '/users/stats', null, {
    'Authorization': `Bearer ${authTokens.accessToken}`
  });
  
  if (result.success) {
    logSuccess('Acceso a ruta protegida exitoso');
    logInfo(`Estadísticas obtenidas: ${Object.keys(result.data.data).length} campos`);
    return true;
  } else {
    logError(`Error accediendo a ruta protegida: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Test 8: Logout
async function testLogout() {
  logHeader('🧪 TEST 8: Logout');
  
  if (!authTokens) {
    logError('No hay tokens disponibles');
    return false;
  }
  
  const result = await makeRequest('POST', '/auth/logout', null, {
    'Authorization': `Bearer ${authTokens.accessToken}`
  });
  
  if (result.success) {
    logSuccess('Logout exitoso');
    authTokens = null;
    return true;
  } else {
    logError(`Error en logout: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Test 9: Acceso sin token (debe fallar)
async function testUnauthorizedAccess() {
  logHeader('🧪 TEST 9: Acceso Sin Token (Debe Fallar)');
  
  const result = await makeRequest('GET', '/auth/profile');
  
  if (!result.success && result.status === 401) {
    logSuccess('Acceso denegado correctamente (sin token)');
    return true;
  } else {
    logError('Error: Se permitió acceso sin token');
    return false;
  }
}

// Función principal
async function runTests() {
  logHeader('🚀 INICIANDO PRUEBAS DEL SISTEMA DE AUTENTICACIÓN');
  logInfo(`API Base URL: ${API_BASE_URL}`);
  logInfo(`Usuario de prueba: ${testUser.email}`);
  
  const tests = [
    { name: 'Registro', fn: testRegister },
    { name: 'Login', fn: testLogin },
    { name: 'Verificar Token', fn: testVerifyToken },
    { name: 'Obtener Perfil', fn: testGetProfile },
    { name: 'Refresh Token', fn: testRefreshToken },
    { name: 'Cambiar Contraseña', fn: testChangePassword },
    { name: 'Ruta Protegida', fn: testProtectedRoute },
    { name: 'Logout', fn: testLogout },
    { name: 'Acceso Sin Token', fn: testUnauthorizedAccess }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      logError(`Error ejecutando ${test.name}: ${error.message}`);
      failed++;
    }
    
    // Pausa entre tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumen
  logHeader('📊 RESUMEN DE PRUEBAS');
  logSuccess(`Pruebas exitosas: ${passed}`);
  if (failed > 0) {
    logError(`Pruebas fallidas: ${failed}`);
  }
  
  const total = passed + failed;
  const successRate = ((passed / total) * 100).toFixed(1);
  
  if (successRate >= 90) {
    logSuccess(`Tasa de éxito: ${successRate}% - ¡Excelente!`);
  } else if (successRate >= 70) {
    logWarning(`Tasa de éxito: ${successRate}% - Bueno, pero hay que mejorar`);
  } else {
    logError(`Tasa de éxito: ${successRate}% - Necesita revisión`);
  }
  
  logHeader('🏁 PRUEBAS COMPLETADAS');
}

// Ejecutar pruebas
runTests().catch(error => {
  logError(`Error ejecutando pruebas: ${error.message}`);
  process.exit(1);
});
