const sgMail = require('@sendgrid/mail');

// Configurar SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Enviar email de recuperación de contraseña
 */
const sendPasswordResetEmail = async (email, resetToken, userName) => {
    try {
        // URL del frontend para reset password
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        const msg = {
            to: email,
            from: process.env.EMAIL_FROM,
            subject: 'Recuperación de Contraseña - ElectroMarket',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background: linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #14b8a6 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 10px 10px 0 0;
                        }
                        .content {
                            background: white;
                            padding: 30px;
                            border-radius: 0 0 10px 10px;
                        }
                        .button {
                            display: inline-block;
                            padding: 15px 30px;
                            margin: 20px 0;
                            background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: bold;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            color: #666;
                            font-size: 12px;
                        }
                        .warning {
                            background-color: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 10px;
                            margin: 15px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔒 Recuperación de Contraseña</h1>
                        </div>
                        <div class="content">
                            <p>Hola <strong>${userName}</strong>,</p>

                            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>ElectroMarket</strong>.</p>

                            <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>

                            <div style="text-align: center;">
                                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
                            </div>

                            <p>O copia y pega este enlace en tu navegador:</p>
                            <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>

                            <div class="warning">
                                <strong>⚠️ Importante:</strong>
                                <ul>
                                    <li>Este enlace expirará en <strong>1 hora</strong></li>
                                    <li>Si no solicitaste este cambio, ignora este correo</li>
                                    <li>Tu contraseña actual permanecerá activa hasta que crees una nueva</li>
                                </ul>
                            </div>

                            <p>Si tienes algún problema, contáctanos respondiendo a este correo.</p>

                            <p>Saludos,<br>
                            <strong>El equipo de ElectroMarket</strong></p>
                        </div>
                        <div class="footer">
                            <p>Este es un correo automático, por favor no respondas directamente.</p>
                            <p>&copy; 2025 ElectroMarket. Todos los derechos reservados.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const response = await sgMail.send(msg);
        console.log('✅ Email de recuperación enviado con SendGrid:', response[0].statusCode);
        return { success: true, messageId: response[0].headers['x-message-id'] };

    } catch (error) {
        console.error('❌ Error enviando email con SendGrid:', error);
        throw new Error(`Error al enviar email: ${error.message}`);
    }
};

/**
 * Enviar email de confirmación de cambio de contraseña
 */
const sendPasswordChangedEmail = async (email, userName) => {
    try {
        const msg = {
            to: email,
            from: process.env.EMAIL_FROM,
            subject: 'Contraseña Actualizada - ElectroMarket',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 10px 10px 0 0;
                        }
                        .content {
                            background: white;
                            padding: 30px;
                            border-radius: 0 0 10px 10px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            color: #666;
                            font-size: 12px;
                        }
                        .alert {
                            background-color: #d1ecf1;
                            border-left: 4px solid #0dcaf0;
                            padding: 10px;
                            margin: 15px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Contraseña Actualizada</h1>
                        </div>
                        <div class="content">
                            <p>Hola <strong>${userName}</strong>,</p>

                            <p>Te confirmamos que la contraseña de tu cuenta en <strong>ElectroMarket</strong> ha sido actualizada exitosamente.</p>

                            <div class="alert">
                                <strong>ℹ️ ¿No realizaste este cambio?</strong><br>
                                Si no fuiste tú quien cambió la contraseña, por favor contacta inmediatamente a nuestro equipo de soporte respondiendo a este correo.
                            </div>

                            <p>Por tu seguridad, te recomendamos:</p>
                            <ul>
                                <li>No compartir tu contraseña con nadie</li>
                                <li>Usar una contraseña única y segura</li>
                                <li>Cerrar sesión en dispositivos que no uses</li>
                            </ul>

                            <p>Gracias por usar ElectroMarket.</p>

                            <p>Saludos,<br>
                            <strong>El equipo de ElectroMarket</strong></p>
                        </div>
                        <div class="footer">
                            <p>Este es un correo automático, por favor no respondas directamente.</p>
                            <p>&copy; 2025 ElectroMarket. Todos los derechos reservados.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const response = await sgMail.send(msg);
        console.log('✅ Email de confirmación enviado con SendGrid:', response[0].statusCode);
        return { success: true, messageId: response[0].headers['x-message-id'] };

    } catch (error) {
        console.error('❌ Error enviando email con SendGrid:', error);
        throw new Error(`Error al enviar email: ${error.message}`);
    }
};

/**
 * Verificar configuración de email (SendGrid)
 */
const verifyEmailConfig = async () => {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error('SENDGRID_API_KEY no está configurada');
        }
        if (!process.env.EMAIL_FROM) {
            throw new Error('EMAIL_FROM no está configurada');
        }

        console.log('✅ Configuración de SendGrid verificada correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error en configuración de email:', error);
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    verifyEmailConfig
};
