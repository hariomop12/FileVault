const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "FileVault API",
    version: "1.0.0",
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
      name: "Hariom Virkhare",
      email: "hariomvirkhare02@gmail.com",
      url: "https://github.com/hariomop12",
    },
    license: {
      name: "ISC",
      url: "https://opensource.org/licenses/ISC",
    },
  },
  host: "localhost:3000",
  schemes: ["http", "https"],
  consumes: ["application/json", "multipart/form-data"],
  produces: ["application/json"],
  securityDefinitions: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },
  definitions: {
    User: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          description: "User ID",
        },
        name: {
          type: "string",
          description: "User full name",
        },
        email: {
          type: "string",
          format: "email",
          description: "User email address",
        },
        email_verified: {
          type: "boolean",
          description: "Email verification status",
        },
        storage_quota: {
          type: "integer",
          description: "Storage quota in bytes",
        },
        created_at: {
          type: "string",
          format: "date-time",
          description: "Account creation timestamp",
        },
      },
    },
    File: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          description: "File ID",
        },
        filename: {
          type: "string",
          description: "Original filename",
        },
        file_path: {
          type: "string",
          description: "File storage path",
        },
        file_size: {
          type: "integer",
          description: "File size in bytes",
        },
        mime_type: {
          type: "string",
          description: "File MIME type",
        },
        uploaded_at: {
          type: "string",
          format: "date-time",
          description: "Upload timestamp",
        },
        user_id: {
          type: "integer",
          description: "Owner user ID (null for anonymous)",
        },
      },
    },
    LoginRequest: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: {
          type: "string",
          format: "email",
          example: "user@example.com",
        },
        password: {
          type: "string",
          minLength: 8,
          example: "password123",
        },
      },
    },
    SignupRequest: {
      type: "object",
      required: ["name", "email", "password"],
      properties: {
        name: {
          type: "string",
          example: "John Doe",
        },
        email: {
          type: "string",
          format: "email",
          example: "john.doe@example.com",
        },
        password: {
          type: "string",
          minLength: 8,
          example: "securePassword123",
        },
      },
    },
    ApiResponse: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          example: true,
        },
        message: {
          type: "string",
          description: "Response message",
        },
        data: {
          type: "object",
          description: "Response data",
        },
      },
    },
    ErrorResponse: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          example: false,
        },
        message: {
          type: "string",
          description: "Error message",
        },
        error: {
          type: "string",
          description: "Error details",
        },
      },
    },
  },
  tags: [
    {
      name: "Authentication",
      description: "User authentication and account management",
    },
    {
      name: "Anonymous Files",
      description: "File operations without authentication",
    },
    {
      name: "User Files",
      description: "Authenticated user file management",
    },
    {
      name: "Health",
      description: "API health and status endpoints",
    },
  ],
};

const outputFile = "./docs/swagger-output.json";
const endpointsFiles = [
  "./app.js",
  "./routes/auth.routes.js",
  "./routes/file.routes.js",
  "./routes/userFile.routes.js",
];

// Generate swagger documentation
swaggerAutogen(outputFile, endpointsFiles, doc)
  .then(() => {
    console.log("✅ Swagger documentation generated successfully!");
    console.log(`📄 Generated file: ${outputFile}`);
    console.log(
      "🚀 You can now view your API docs at: http://localhost:3000/api-docs"
    );
  })
  .catch((error) => {
    console.error("❌ Error generating swagger documentation:", error);
  });
