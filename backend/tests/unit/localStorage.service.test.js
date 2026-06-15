const fs = require('fs').promises;
const path = require('path');

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test content')),
    unlink: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
  },
}));

const LocalStorageService = require('../../services/localStorage.service');

describe('LocalStorageService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocalStorageService('/tmp/uploads');
  });

  describe('constructor', () => {
    it('should set uploadDir', () => {
      expect(service.uploadDir).toBe('/tmp/uploads');
    });

    it('should ensure upload directory exists', () => {
      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/uploads', { recursive: true });
    });
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const file = { buffer: Buffer.from('hello'), originalname: 'test.txt' };
      const result = await service.uploadFile(file, 'test.txt');

      expect(result).toEqual({
        success: true,
        key: 'test.txt',
        path: '/tmp/uploads/test.txt',
      });
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/uploads/test.txt',
        file.buffer
      );
    });

    it('should handle upload errors', async () => {
      fs.writeFile.mockRejectedValueOnce(new Error('Disk full'));
      const file = { buffer: Buffer.from('hello'), originalname: 'test.txt' };

      await expect(service.uploadFile(file, 'test.txt')).rejects.toThrow('Disk full');
    });
  });

  describe('getFile', () => {
    it('should retrieve a file', async () => {
      const result = await service.getFile('test.txt');
      expect(result).toEqual(Buffer.from('test content'));
      expect(fs.readFile).toHaveBeenCalledWith('/tmp/uploads/test.txt');
    });

    it('should throw when file not found', async () => {
      fs.readFile.mockRejectedValueOnce(new Error('ENOENT'));
      await expect(service.getFile('missing.txt')).rejects.toThrow('ENOENT');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      const result = await service.deleteFile('test.txt');
      expect(result).toEqual({ success: true });
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/uploads/test.txt');
    });

    it('should handle deletion errors', async () => {
      fs.unlink.mockRejectedValueOnce(new Error('Permission denied'));
      await expect(service.deleteFile('test.txt')).rejects.toThrow('Permission denied');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      const result = await service.fileExists('test.txt');
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));
      const result = await service.fileExists('missing.txt');
      expect(result).toBe(false);
    });
  });

  describe('getFileUrl', () => {
    it('should generate correct URL', () => {
      process.env.BACKEND_URL = 'http://localhost:4000';
      const url = service.getFileUrl('user-1/file.pdf');
      expect(url).toBe('http://localhost:4000/api/v1/files/local/user-1%2Ffile.pdf');
    });
  });
});
