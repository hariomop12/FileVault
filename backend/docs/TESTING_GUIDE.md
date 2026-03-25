# 🧪 FileVault API Testing Guide

## 📊 Testing Strategy Overview

This guide covers comprehensive testing approaches for the FileVault API, including both manual testing with Postman and automated testing scenarios.

---

## 🎯 **1. Swagger Documentation Testing**

### **Access Swagger UI**
```
URL: http://localhost:3000/api-docs
```

### **Key Features:**
- **Interactive testing** - Execute API calls directly
- **Schema validation** - Real-time request/response validation
- **Authentication testing** - Built-in JWT token management
- **Parameter exploration** - Understand all available options

### **Testing Workflow:**
1. **Explore endpoints** - Browse all available APIs
2. **Test authentication** - Sign up → Verify → Login
3. **File operations** - Upload → List → Download → Delete
4. **Error scenarios** - Test validation and error handling

---

## 📦 **2. Postman Collection Testing**

### **Available Collections:**
1. **Professional Template** - `FileVault_API_Collection.json`
2. **Your Custom Tests** - Export your existing Postman tests

### **Import Instructions:**
```bash
# In Postman:
File → Import → Select JSON files
1. FileVault_API_Collection.json
2. FileVault_Environment.json
```

### **Testing Scenarios:**

#### **🔐 Authentication Flow**
```
1. Register new user
2. Verify email (get token from logs/email)
3. Login with verified account
4. Test protected endpoints
5. Test token expiration
```

#### **📁 File Management Flow**
```
1. Upload file (anonymous)
2. Download file (with secret key)
3. Upload file (authenticated)
4. List user files
5. Get file metadata
6. Create shareable link
7. Delete file
```

#### **🛡️ Security Testing**
```
1. Test rate limiting
2. Test invalid tokens
3. Test file size limits
4. Test file type validation
5. Test unauthorized access
```

---

## 🔬 **3. Automated Testing Scenarios**

### **Performance Testing**
```javascript
// Add to Postman test scripts
pm.test("Response time < 2000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

pm.test("File upload < 5000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});
```

### **Data Validation**
```javascript
pm.test("File upload response structure", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success', true);
    pm.expect(jsonData.file).to.have.property('id');
    pm.expect(jsonData.file).to.have.property('filename');
    pm.expect(jsonData.file).to.have.property('file_size');
});
```

### **Security Validation**
```javascript
pm.test("JWT token required", function () {
    if (!pm.request.headers.get('Authorization')) {
        pm.expect(pm.response.code).to.equal(401);
    }
});
```

---

## 📈 **4. Load Testing Scenarios**

### **File Upload Load Test**
```javascript
// Pre-request script for load testing
const fileSize = pm.environment.get('test_file_size') || '1MB';
const concurrentUsers = pm.environment.get('concurrent_users') || 10;

console.log(`Testing with ${concurrentUsers} users, ${fileSize} files`);
```

### **Rate Limiting Validation**
```javascript
// Test rate limits
pm.test("Rate limiting works", function () {
    const retryAfter = pm.response.headers.get('Retry-After');
    if (pm.response.code === 429) {
        pm.expect(retryAfter).to.exist;
    }
});
```

---

## 🐛 **5. Error Testing Scenarios**

### **File Upload Errors**
```bash
# Test invalid file types
curl -X POST http://localhost:3000/api/v1/files/upload \
  -F "file=@malicious.exe"

# Test oversized files
curl -X POST http://localhost:3000/api/v1/files/upload \
  -F "file=@huge_file.bin"

# Test without file
curl -X POST http://localhost:3000/api/v1/files/upload
```

### **Authentication Errors**
```bash
# Test invalid credentials
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid@email.com","password":"wrong"}'

# Test expired token
curl -X GET http://localhost:3000/api/v1/files \
  -H "Authorization: Bearer expired_token"
```

---

## 📊 **6. Test Data Management**

### **Environment Variables**
```json
{
  "base_url": "http://localhost:3000",
  "test_email": "test+{{$timestamp}}@example.com",
  "test_password": "TestPassword123!",
  "auth_token": "{{login_token}}",
  "file_id": "{{uploaded_file_id}}"
}
```

### **Dynamic Test Data**
```javascript
// Generate unique test data
const timestamp = Date.now();
pm.environment.set('unique_email', `test${timestamp}@example.com`);
pm.environment.set('test_filename', `test_file_${timestamp}.pdf`);
```

---

## 🎯 **7. Test Reporting & Monitoring**

### **Newman CLI Testing**
```bash
# Install Newman
ppnpm install -g newman

# Run collection
newman run postman/FileVault_API_Collection.json \
  -e postman/FileVault_Environment.json \
  --reporters cli,html \
  --reporter-html-export results.html
```

### **CI/CD Integration**
```yaml
# GitHub Actions example
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Postman tests
        run: |
          ppnpm install -g newman
          newman run postman/FileVault_API_Collection.json
```

---

## 📋 **8. Testing Checklist**

### **✅ Functional Testing**
- [ ] User registration and verification
- [ ] Login and token generation
- [ ] File upload (anonymous & authenticated)
- [ ] File download and access control
- [ ] File deletion and cleanup
- [ ] Shareable link creation
- [ ] Password reset flow

### **✅ Security Testing**
- [ ] Authentication bypass attempts
- [ ] Rate limiting enforcement
- [ ] File type validation
- [ ] Size limit enforcement
- [ ] Token expiration handling
- [ ] CORS policy validation

### **✅ Performance Testing**
- [ ] Response time under load
- [ ] Concurrent user handling
- [ ] Large file upload performance
- [ ] Database query optimization
- [ ] Memory usage monitoring

### **✅ Error Handling**
- [ ] Invalid input validation
- [ ] Database connection errors
- [ ] S3 service unavailability
- [ ] Network timeout handling
- [ ] Graceful error responses

---

## 🚀 **Quick Testing Commands**

```bash
# Start server
ppnpm run dev

# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/api-docs

# Run Postman collection
newman run postman/FileVault_API_Collection.json

# Run with environment
newman run postman/FileVault_API_Collection.json \
  -e postman/FileVault_Environment.json
```

This comprehensive testing approach ensures your FileVault API is robust, secure, and production-ready! 🎯
