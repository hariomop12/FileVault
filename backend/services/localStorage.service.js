const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class LocalStorageService {
    constructor(uploadDir = './uploads') {
        this.uploadDir = uploadDir;
        this.ensureUploadDir();
    }

    async ensureUploadDir() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log(`✅ Local upload directory ready: ${this.uploadDir}`);
        } catch (error) {
            console.error(`❌ Failed to create upload directory: ${error.message}`);
        }
    }

    async uploadFile(file, key) {
        try {
            const filePath = path.join(this.uploadDir, key);
            const fileDir = path.dirname(filePath);

            // Create directory if it doesn't exist
            await fs.mkdir(fileDir, { recursive: true });

            // Write file
            await fs.writeFile(filePath, file.buffer);

            console.log(`✅ File uploaded locally: ${key}`);
            return { success: true, key, path: filePath };
        } catch (error) {
            console.error(`❌ Local file upload failed: ${error.message}`);
            throw error;
        }
    }

    async getFile(key) {
        try {
            const filePath = path.join(this.uploadDir, key);
            const fileBuffer = await fs.readFile(filePath);
            return fileBuffer;
        } catch (error) {
            console.error(`❌ Failed to read file: ${error.message}`);
            throw error;
        }
    }

    async deleteFile(key) {
        try {
            const filePath = path.join(this.uploadDir, key);
            await fs.unlink(filePath);
            console.log(`✅ File deleted locally: ${key}`);
            return { success: true };
        } catch (error) {
            console.error(`❌ Failed to delete file: ${error.message}`);
            throw error;
        }
    }

    async fileExists(key) {
        try {
            const filePath = path.join(this.uploadDir, key);
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    getFileUrl(key) {
        // For local development, return a URL that the backend can serve
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        return `${baseUrl}/api/v1/files/local/${encodeURIComponent(key)}`;
    }
}

module.exports = LocalStorageService;
