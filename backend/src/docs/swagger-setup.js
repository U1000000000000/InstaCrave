const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./openapi');

/**
 * Setup Swagger UI for interactive API documentation
 * @param {Express.Application} app - Express app instance
 */
module.exports = (app) => {
  // Swagger UI configuration with enhanced developer experience
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true, // Remember auth tokens across page refreshes
      displayRequestDuration: true, // Show request/response times
      docExpansion: 'list', // Show only endpoints by default (not full schemas)
      filter: true, // Enable search/filter for endpoints
      showExtensions: true, // Show vendor extensions
      showCommonExtensions: true, // Show common vendor extensions
      syntaxHighlight: {
        activate: true,
        theme: 'monokai' // Syntax highlighting theme
      },
      tryItOutEnabled: true, // Enable "Try it out" by default
      supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'], // Enable all HTTP methods
      defaultModelsExpandDepth: 1, // Show model examples by default
      defaultModelExpandDepth: 3, // Depth of model expansion
      displayOperationId: false, // Don't show operation IDs (cleaner UI)
      deepLinking: true, // Enable deep linking to specific endpoints
      requestSnippetsEnabled: true, // Enable request code snippets
      requestSnippets: {
        generators: {
          curl_bash: {
            title: 'cURL (Bash)',
            syntax: 'bash'
          },
          curl_cmd: {
            title: 'cURL (CMD)',
            syntax: 'bash'
          },
          curl_powershell: {
            title: 'cURL (PowerShell)',
            syntax: 'powershell'
          }
        },
        defaultExpanded: true,
        languages: null // Generate all available languages
      }
    },
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { font-size: 2.5rem; color: #FF6B35; }
      .swagger-ui .info .description { font-size: 1.1rem; line-height: 1.6; }
      .swagger-ui .opblock-summary-method { min-width: 80px; }
      .swagger-ui .opblock.opblock-get { background: rgba(97, 175, 254, 0.1); border-color: #61affe; }
      .swagger-ui .opblock.opblock-post { background: rgba(73, 204, 144, 0.1); border-color: #49cc90; }
      .swagger-ui .opblock.opblock-put { background: rgba(252, 161, 48, 0.1); border-color: #fca130; }
      .swagger-ui .opblock.opblock-delete { background: rgba(249, 62, 62, 0.1); border-color: #f93e3e; }
      .swagger-ui .opblock.opblock-patch { background: rgba(80, 227, 194, 0.1); border-color: #50e3c2; }
    `,
    customSiteTitle: 'InstaCrave API Documentation',
    customfavIcon: '/favicon.ico'
  };

  // Serve Swagger UI at /docs
  app.use('/docs', swaggerUi.serve);
  app.get('/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Serve OpenAPI JSON spec at /openapi.json
  app.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for spec download
    res.status(200).json(swaggerSpec);
  });

  // Serve OpenAPI YAML spec at /openapi.yaml (for Postman, etc.)
  app.get('/openapi.yaml', (req, res) => {
    const yaml = require('js-yaml');
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const yamlSpec = yaml.dump(swaggerSpec);
      res.status(200).send(yamlSpec);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to generate YAML spec' });
    }
  });

  // Redirect /api-docs to /docs for backward compatibility
  app.get('/api-docs', (req, res) => res.redirect('/docs'));

  // Health check for documentation service
  app.get('/docs/health', (req, res) => {
    res.json({
      success: true,
      service: 'API Documentation',
      status: 'operational',
      endpoints: {
        swagger: '/docs',
        openApiJson: '/openapi.json',
        openApiYaml: '/openapi.yaml'
      }
    });
  });
};

