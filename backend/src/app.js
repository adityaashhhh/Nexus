const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');

// Import route files
const authRoutes = require('./routes/v1/auth.routes');
const productRoutes = require('./routes/v1/product.routes');

// Initialize Express app
const app = express();

// --------------- SECURITY MIDDLEWARE ---------------

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// --------------- BODY PARSING ---------------

app.use(express.json({ limit: '10kb' })); // Body limit for security
app.use(express.urlencoded({ extended: true }));

// --------------- LOGGING ---------------

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// --------------- SWAGGER DOCUMENTATION ---------------

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NexusAPI',
      version: '1.0.0',
      description:
        'A scalable REST API with JWT Authentication and Role-Based Access Control (RBAC). Built with Express.js and MongoDB.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
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
  apis: ['./src/routes/v1/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'NexusAPI — Documentation',
}));

// --------------- SERVE FRONTEND ---------------

app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// --------------- API ROUTES (Versioned) ---------------

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);

// --------------- ROOT ROUTE ---------------

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Scalable REST API is running',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      products: '/api/v1/products',
    },
  });
});

// --------------- HEALTH CHECK ---------------

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// --------------- ERROR HANDLING ---------------

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
