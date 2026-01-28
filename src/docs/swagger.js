const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OPD Token Allocation Engine API',
      version: '1.0.0',
      description: 'A comprehensive Hospital OPD Token Allocation System with priority-based queue management',
      contact: {
        name: 'OPD Support',
        email: 'support@opd.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    './src/routes/authRoutes.js',
    './src/routes/doctorRoutes.js',
    './src/routes/tokenRoutes.js',
    './src/routes/cancellationRoutes.js',
    './src/routes/emergencyRoutes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
