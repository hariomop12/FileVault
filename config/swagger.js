const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FileVault API',
      version: '1.0.0',
      description: `
# 🔐 FileVault - Secure Cloud File Storage API

## Overview
FileVault is an enterprise-grade secure file storage solution with advanced authentication and AWS S3 integration.

## Features
- 🔒 JWT-based authentication with email verification
- 📁 Secure file upload/download with AWS S3
- 🛡️ Rate limiting and security middleware
- 📊 Comprehensive logging and monitoring
- 🔗 Shareable links with expiration controls

## Authentication
Most endpoints require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limits
- Auth endpoints: 10 requests per 15 minutes
- File operations: 100 requests per 15 minutes
- Anonymous uploads: 5 requests per minute

## File Upload Constraints
- Maximum file size: 5GB
- Supported formats: Images, Documents, Archives, Media
- File type validation enforced
      `,
      contact: {
        name: 'Hariom Virkhare',
        email: 'hariomvirkhare02@gmail.com',
        url: 'https://github.com/hariomop12'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.filevault.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            email_verified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            storage_quota: {
              type: 'integer',
              description: 'Storage quota in bytes'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        File: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'File ID'
            },
            filename: {
              type: 'string',
              description: 'Original filename'
            },
            file_size: {
              type: 'integer',
              description: 'File size in bytes'
            },
            file_type: {
              type: 'string',
              description: 'MIME type of the file'
            },
            is_public: {
              type: 'boolean',
              description: 'Public accessibility status'
            },
            download_count: {
              type: 'integer',
              description: 'Number of downloads'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Detailed error information'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and account management'
      },
      {
        name: 'Anonymous Files',
        description: 'File operations without authentication'
      },
      {
        name: 'User Files',
        description: 'Authenticated user file management'
      },
      {
        name: 'Health',
        description: 'API health and status endpoints'
      }
    ]
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './app.js'
  ]
};

const specs = swaggerJSDoc(options);

module.exports = specs;
