# 🔐 FileVault - Secure Cloud File Storage

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare_R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**Enterprise-grade secure file storage solution with React frontend, JWT authentication, and Cloudflare R2 integration**

[Features](#-features) • [Quick Start](#-quick-start) • [API Docs](#-api-documentation) • [Deployment](#-deployment)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**FileVault** is a full-stack secure file storage application that provides:
- **React Frontend** with modern UI/UX and dark mode support
- **Node.js/Express Backend** with RESTful API
- **JWT Authentication** with email verification
- **Cloudflare R2 Storage** for scalable file hosting
- **PostgreSQL Database** with Aiven cloud hosting
- **Docker Support** for easy deployment

Perfect for building secure file sharing platforms, document management systems, or cloud storage solutions.

---

## ✨ Features

### 🔐 **Authentication & Security**
- ✅ JWT-based authentication with secure token management
- ✅ Email verification system with automated emails (Gmail SMTP)
- ✅ Password reset functionality
- ✅ Bcrypt password hashing
- ✅ Rate limiting on all endpoints
- ✅ CORS and security headers (Helmet.js)

### 📁 **File Management**
- ✅ Anonymous file uploads for quick sharing
- ✅ Authenticated user file management
- ✅ Multiple file format support (images, documents, archives, media)
- ✅ File size validation (up to 5GB)
- ✅ Secure file deletion with R2 cleanup
- ✅ Shareable links with expiration controls

### 🎨 **Frontend Features**
- ✅ Modern React UI with TypeScript
- ✅ Dark/Light mode toggle
- ✅ Responsive design (mobile-friendly)
- ✅ File upload with drag-and-drop
- ✅ User dashboard with file management
- ✅ Real-time upload progress

### ☁️ **Cloud Integration**
- ✅ Cloudflare R2 for scalable storage
- ✅ Presigned URLs for secure downloads
- ✅ Automatic file organization
- ✅ Global edge distribution

### 📊 **Monitoring & Logging**
- ✅ Winston logging with file rotation
- ✅ Database query monitoring
- ✅ Error tracking with unique IDs
- ✅ Health check endpoints

### 🗄️ **Distributed Storage Engine**
- ✅ Multi-node storage registry with heartbeat + failure detection (suspicion window, STALE → DOWN)
- ✅ Consistent hashing with virtual nodes (add/remove node remaps only ~1/n keys)
- ✅ Replication (`REPLICATION_FACTOR=3`) across distinct nodes + self-healing background reconciler
- ✅ Multipart uploads (resume/retry, per-part ETags, presigned URLs, R2 CORS)
- ✅ RBAC roles: `ADMIN` / `USER` / `READ_ONLY` with admin storage-nodes & replication dashboard
- ✅ Prometheus metrics (Prom-client) + committed Grafana dashboard

---

## 🛠️ Tech Stack

### **Backend**
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL (Aiven Cloud)
- **Storage:** Cloudflare R2 (S3-compatible)
- **Authentication:** JWT + Bcrypt
- **Email:** Nodemailer (Gmail SMTP)
- **Logging:** Winston
- **Security:** Helmet.js, CORS, Rate Limiting

### **Frontend**
- **Framework:** React 18 with TypeScript
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod validation
- **HTTP Client:** Axios
- **Styling:** Tailwind CSS
- **Notifications:** React Hot Toast
- **State:** React Context API

### **DevOps**
- **Containerization:** Docker + Docker Compose
- **Development:** Nodemon, Hot Reload
- **Database Migrations:** dbmate

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ and npm
- Docker and Docker Compose (recommended)
- PostgreSQL database (or use Aiven free tier)
- Cloudflare R2 bucket
- Gmail account for SMTP (or other email service)

### **1. Clone Repository**
```bash
git clone https://github.com/hariomop12/FileVault.git
cd FileVault
```

### **2. Environment Setup**
Create `backend/.env` (all backend commands below run from the `backend/` directory):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database (Aiven PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Cloudflare R2 Storage
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=FileVault <your-email@gmail.com>

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

### **3. Run with Docker (Recommended)**
```bash
# Start all services (backend, frontend, postgres)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

**Access the application:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

### **4. Run Locally (Without Docker)**

**Backend:**
```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## 🔧 Configuration

### **Database Setup (Aiven)**
1. Create free PostgreSQL database at [Aiven.io](https://aiven.io)
2. Copy the connection string to `DATABASE_URL` in `.env`
3. Run migrations: `npm run migrate`

### **Cloudflare R2 Setup**
1. Create R2 bucket in Cloudflare dashboard
2. Generate API tokens with R2 permissions
3. Add credentials to `.env`

### **Email Setup (Gmail)**
1. Enable 2-Step Verification in Google Account
2. Generate App Password: [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Use app password (16 characters, no spaces) in `EMAIL_PASS`

### **Admin Account (RBAC)**
New signups get the `USER` role and must verify email before login. To promote a user:
```sql
UPDATE filevault_users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

### **R2 CORS (browser uploads)**
First time only — allows the browser to PUT multipart parts to the bucket directly:
```bash
node scripts/configureR2Cors.js
```

### **Rate Limiting**
```javascript
// Default limits (configurable in code):
API endpoints: 100 requests/15 minutes
Auth endpoints: 10 requests/15 minutes
File uploads: 5 requests/1 minute
```

---

## 📚 API Documentation

### **Authentication Endpoints**
```http
POST   /api/v1/auth/signup              # User registration
POST   /api/v1/auth/login               # User login
GET    /api/v1/auth/verify-email        # Email verification
POST   /api/v1/auth/forgot-password     # Password reset request
POST   /api/v1/auth/reset-password      # Password reset
POST   /api/v1/auth/resend-verification # Resend verification email
```

### **File Management (Anonymous)**
```http
POST   /api/v1/files/upload             # Anonymous file upload
POST   /api/v1/files/download           # Anonymous file download
```

### **File Management (Authenticated)**
```http
GET    /api/v1/user/files               # Get user's files
POST   /api/v1/user/files/upload        # Upload file
GET    /api/v1/user/files/:id           # Get file metadata
GET    /api/v1/user/files/:id/download  # Get download link
DELETE /api/v1/user/files/:id           # Delete file
POST   /api/v1/user/files/:id/share     # Create shareable link
```

### **Example: User Registration**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### **Example: File Upload**
```bash
curl -X POST http://localhost:3000/api/v1/user/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/file.pdf"
```

**Interactive API Documentation:**
Visit http://localhost:3000/api-docs for Swagger UI with all endpoints.

---

## 🐳 Deployment

### **Docker Deployment**

**Development:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

**Production:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### **Manual Deployment**

**Backend:**
```bash
npm install --production
npm run migrate
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run build
# Serve build folder with nginx or serve
```

### **Environment Variables for Production**
```env
NODE_ENV=production
DATABASE_URL=your-production-db-url
FRONTEND_URL=https://your-domain.com
```

---

## 📁 Project Structure

```
FileVault/
├── backend/
│   ├── config/          # Database, R2, email config
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Auth, validation, rate limiting
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic (auth, file, R2)
│   ├── utils/           # Helpers and utilities
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
│
├── frontend/
│   ├── public/          # Static assets
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # Context providers
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── types/       # TypeScript types
│   │   └── App.tsx      # Main app component
│   └── package.json
│
├── db/
│   └── migrations/      # Database migrations
│
├── docker-compose.dev.yml   # Development setup
├── docker-compose.prod.yml  # Production setup
├── Dockerfile.dev           # Backend dev image
├── .env                     # Environment variables
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### **Code Standards**
- Follow ESLint configuration
- Write tests for new features
- Update documentation as needed
- Use conventional commits

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Hariom Virkhare**
- GitHub: [@hariomop12](https://github.com/hariomop12)
- Email: hariomvirkhare02@gmail.com
- LinkedIn: [hariomop12](https://linkedin.com/in/hariomop12)

---

## 🙏 Acknowledgments

- [Cloudflare R2](https://www.cloudflare.com/products/r2/) for excellent cloud storage
- [Aiven](https://aiven.io) for managed PostgreSQL hosting
- [Node.js](https://nodejs.org/) and [React](https://react.dev/) communities
- All open-source contributors

---

## 📞 Support

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/hariomop12/FileVault/issues)
- 💡 **Feature Requests:** [GitHub Discussions](https://github.com/hariomop12/FileVault/discussions)
- 🔒 **Security Issues:** Email directly to hariomvirkhare02@gmail.com

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by Hariom Virkhare

</div>