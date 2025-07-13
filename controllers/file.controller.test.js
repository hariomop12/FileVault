// file.controller.test.js
const { uploadFilee } = require('./file.controller');
const FileService = require('../services/file.service');
const logger = require('../utils/logger');

// Mock dependencies
jest.mock('../services/file.service');
jest.mock('../utils/logger');

describe('UserFileController', () => {
  describe('uploadFilee', () => {
    let req, res;

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Setup request and response objects
      req = {
        file: { 
          originalname: 'test.txt',
          buffer: Buffer.from('test content'),
          mimetype: 'text/plain',
          size: 12
        },
        user: { id: 123 }
      };
      
      res = {
        status: jest.fn(() => res),
        json: jest.fn()
      };
    });

    test('should return 400 when no file is provided', async () => {
      // Arrange
      req.file = null;
      
      // Act
      await uploadFilee(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No file uploaded'
      });
    });

    test('should upload file successfully', async () => {
      // Arrange
      const mockResult = {
        file_id: '123',
        file_name: 'test.txt'
      };
      FileService.uploadUsersFile.mockResolvedValue(mockResult);
      
      // Act
      await uploadFilee(req, res);
      
      // Assert
      expect(FileService.uploadUsersFile).toHaveBeenCalledWith(req.file, req.user.id);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'File uploaded successfully',
        data: mockResult
      });
    });

    test('should handle errors properly', async () => {
      // Arrange
      FileService.uploadUsersFile.mockRejectedValue(new Error('Test error'));
      
      // Act
      await uploadFilee(req, res);
      
      // Assert
      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to upload file'
      }));
    });
  });
});