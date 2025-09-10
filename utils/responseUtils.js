/**
 * Utilidades para respuestas HTTP estandarizadas
 */

const successResponse = (res, data, message = 'Operación exitosa', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const errorResponse = (res, message, statusCode = 500, details = null) => {
    const response = {
        success: false,
        error: message
    };
    
    if (details) {
        response.details = details;
    }
    
    return res.status(statusCode).json(response);
};

const paginatedResponse = (res, data, pagination, message = 'Datos obtenidos exitosamente') => {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.ceil(pagination.total / pagination.limit),
            hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
            hasPrev: pagination.page > 1
        }
    });
};

const validationErrorResponse = (res, errors) => {
    return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        details: errors
    });
};

module.exports = {
    successResponse,
    errorResponse,
    paginatedResponse,
    validationErrorResponse
};