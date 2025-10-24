import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

// Mock the CreditReport model
vi.mock('../models/CreditReport.js', () => {
  const MockCreditReport = vi.fn();
  
  // Mock instance methods
  MockCreditReport.prototype.save = vi.fn().mockResolvedValue({});
  MockCreditReport.prototype.toJSON = vi.fn().mockReturnValue({});
  
  // Mock static methods with chainable query
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
    then: vi.fn((resolve) => resolve([])),
    countDocuments: vi.fn().mockResolvedValue(0)
  };
  
  MockCreditReport.find = vi.fn().mockReturnValue(mockQuery);
  MockCreditReport.findOne = vi.fn().mockReturnValue({
    ...mockQuery,
    exec: vi.fn().mockResolvedValue(null),
    then: vi.fn((resolve) => resolve(null))
  });
  MockCreditReport.findById = vi.fn().mockReturnValue({
    ...mockQuery,
    exec: vi.fn().mockResolvedValue(null),
    then: vi.fn((resolve) => resolve(null))
  });
  MockCreditReport.countDocuments = vi.fn().mockResolvedValue(0);
  MockCreditReport.create = vi.fn().mockImplementation((data) => {
    const instance = {
      _id: `api_${Date.now()}`,
      ...data,
      save: vi.fn().mockResolvedValue(data)
    };
    return Promise.resolve(instance);
  });
  MockCreditReport.deleteOne = vi.fn().mockResolvedValue({ deletedCount: 0 });
  MockCreditReport.aggregate = vi.fn().mockResolvedValue([{
    _id: null,
    totalReports: 0,
    totalAccounts: 0,
    totalEnquiries: 0,
    avgScore: 750
  }]);
  
  return { default: MockCreditReport };
});

// Mock Cloudinary module
vi.mock('../config/cloudinary.js', () => ({
  uploadXmlFile: vi.fn().mockResolvedValue({
    url: 'https://res.cloudinary.com/test/raw/upload/test.xml',
    public_id: 'test-xml-file-id'
  }),
  deleteXmlFile: vi.fn().mockResolvedValue({ result: 'ok' })
}));

// Import app after mocks are set up
import app from '../server.js';

describe('API Tests - Report Endpoints', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any test files
    const testFiles = [
      path.join(process.cwd(), 'tests', 'test-api-upload.xml'),
      path.join(process.cwd(), 'tests', 'test-invalid.txt')
    ];
    
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  describe('POST /api/upload', () => {
    it('should handle file upload successfully', async () => {
      const testXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <INProfileResponse>
          <Header>
            <ReportDate>2024-01-01</ReportDate>
            <ReportTime>12:00:00</ReportTime>
          </Header>
          <CreditProfile>
            <Applicant>
              <ApplicantFirstName>John</ApplicantFirstName>
              <ApplicantLastName>Doe</ApplicantLastName>
            </Applicant>
            <Accounts>
              <Account>
                <AccountNumber>123456</AccountNumber>
                <AccountType>CC</AccountType>
                <CurrentBalance>5000</CurrentBalance>
              </Account>
            </Accounts>
          </CreditProfile>
        </INProfileResponse>`;

      const testFilePath = path.join(process.cwd(), 'tests', 'test-api-upload.xml');

      try {
        fs.writeFileSync(testFilePath, testXmlContent);

        const response = await request(app)
          .post('/api/upload')
          .attach('file', testFilePath)  // Correct field name is 'file'
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('processed');
        // Note: The current API doesn't return reportId in response.data, just success message
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should reject non-XML files', async () => {
      const testFilePath = path.join(process.cwd(), 'tests', 'test-invalid.txt');

      try {
        fs.writeFileSync(testFilePath, 'This is not XML');

        const response = await request(app)
          .post('/api/upload')
          .attach('file', testFilePath)
          .expect(422); // Validation error for non-XML files

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('XML');
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should handle missing file upload', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No file uploaded');
    });
  });

  describe('GET /api/reports', () => {
    it('should return empty reports list', async () => {
      const response = await request(app)
        .get('/api/reports')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toEqual([]);
      expect(response.body.data.pagination.totalPages).toBe(0);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/reports?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toEqual([]);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(0);
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .get('/api/reports/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid ObjectId format', async () => {
      const response = await request(app)
        .get('/api/reports/invalid-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('should return 404 for non-existent report deletion', async () => {
      const response = await request(app)
        .delete('/api/reports/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reports/stats', () => {
    it('should return statistics with empty data', async () => {
      const response = await request(app)
        .get('/api/reports/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview.totalReports).toBe(0);
      expect(response.body.data.overview.totalAccounts).toBe(0);
      expect(response.body.data.overview.totalEnquiries).toBe(0);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')  // Correct endpoint is /health not /api/health
        .expect(200);

      expect(response.body.status).toBe('OK');
    });
  });
});
