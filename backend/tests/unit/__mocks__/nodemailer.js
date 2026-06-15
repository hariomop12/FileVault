const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-id' });

const mockTransporter = {
  sendMail: mockSendMail,
  options: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: 'test@test.com' },
  },
};

const nodemailer = {
  createTransport: jest.fn().mockReturnValue(mockTransporter),
};

module.exports = nodemailer;
