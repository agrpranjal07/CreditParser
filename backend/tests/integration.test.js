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
      _id: `integration_${Date.now()}`,
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
    url: 'https://res.cloudinary.com/test/raw/upload/integration-test.xml',
    public_id: 'integration-test-xml-id'
  }),
  deleteXmlFile: vi.fn().mockResolvedValue({ result: 'ok' })
}));

// Import app after mocks are set up
import app from '../server.js';

describe('Integration Tests - Full Workflow', () => {
  beforeEach(() => {
    // Reset all mocks and data
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test files
    const testFiles = [
      path.join(process.cwd(), 'tests', 'integration-upload.xml'),
      path.join(process.cwd(), 'tests', 'integration-invalid.xml'),
      path.join(process.cwd(), 'tests', 'integration-malformed.xml'),
      path.join(process.cwd(), 'tests', 'integration-large.xml')
    ];
    
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  describe('Complete XML Processing Workflow', () => {
    it('should handle complete upload and processing flow', async () => {
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

      const testFilePath = path.join(process.cwd(), 'tests', 'integration-upload.xml');

      try {
        fs.writeFileSync(testFilePath, testXmlContent);

        const uploadResponse = await request(app)
          .post('/api/upload')
          .attach('file', testFilePath)  // Use correct field name
          .expect(201);

        expect(uploadResponse.body.success).toBe(true);
        expect(uploadResponse.body.message).toContain('processed');
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should handle invalid XML format gracefully', async () => {
      const invalidXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <GenericResponse>
          <Data>Not Experian format</Data>
        </GenericResponse>`;

      const testFilePath = path.join(process.cwd(), 'tests', 'integration-invalid.xml');

      try {
        fs.writeFileSync(testFilePath, invalidXmlContent);

        const response = await request(app)
          .post('/api/upload')
          .attach('file', testFilePath)
          .expect(422);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Experian');
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should handle malformed XML gracefully', async () => {
      const malformedXml = '<?xml version="1.0"?><broken><xml>';

      const testFilePath = path.join(process.cwd(), 'tests', 'integration-malformed.xml');

      try {
        fs.writeFileSync(testFilePath, malformedXml);

        const response = await request(app)
          .post('/api/upload')
          .attach('file', testFilePath)
          .expect(422);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid XML format');
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should handle large XML files efficiently', async () => {
      // Create a large but valid Experian XML
      let largeXml = `<?xml version="1.0" encoding="UTF-8"?>
        <INProfileResponse>
          <Header>
            <ReportDate>2024-01-01</ReportDate>
            <ReportTime>12:00:00</ReportTime>
          </Header>
          <CreditProfile>
            <Applicant>
              <ApplicantFirstName>Large</ApplicantFirstName>
              <ApplicantLastName>Report</ApplicantLastName>
            </Applicant>
            <Accounts>`;
      
      // Add multiple accounts to make it larger
      for (let i = 0; i < 50; i++) {
        largeXml += `
              <Account>
                <AccountNumber>ACCT${i.toString().padStart(6, '0')}</AccountNumber>
                <AccountType>CC</AccountType>
                <CurrentBalance>${(i * 100).toString()}</CurrentBalance>
              </Account>`;
      }
      
      largeXml += `
            </Accounts>
          </CreditProfile>
        </INProfileResponse>`;

      const testFilePath = path.join(process.cwd(), 'tests', 'integration-large.xml');

      try {
        fs.writeFileSync(testFilePath, largeXml);

        const response = await request(app)
          .post('/api/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('processed');
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });

  describe('API Endpoint Integration', () => {
    it('should handle reports listing workflow', async () => {
      const response = await request(app)
        .get('/api/reports')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toEqual([]);
      expect(response.body.data.pagination.totalPages).toBe(0);
    });

    it('should handle statistics endpoint workflow', async () => {
      const response = await request(app)
        .get('/api/reports/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview.totalReports).toBe(0);
      expect(response.body.data.overview.totalAccounts).toBe(0);
    });

    it('should handle health check integration', async () => {
      const response = await request(app)
        .get('/health')  // Correct health endpoint
        .expect(200);

      expect(response.body.status).toBe('OK');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle missing file uploads', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No file uploaded');
    });

    it('should handle invalid report ID requests', async () => {
      const response = await request(app)
        .get('/api/reports/invalid-id-format')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent report requests', async () => {
      const response = await request(app)
        .get('/api/reports/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('End-to-End Workflow Testing', () => {
    it('should complete full workflow: upload -> list -> stats', async () => {
      // Step 1: Upload a file
      const testXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <INProfileResponse>
          <Header>
            <ReportDate>2024-01-01</ReportDate>
            <ReportTime>12:00:00</ReportTime>
          </Header>
          <CreditProfile>
            <Applicant>
              <ApplicantFirstName>E2E</ApplicantFirstName>
              <ApplicantLastName>Test</ApplicantLastName>
            </Applicant>
            <Accounts>
              <Account>
                <AccountNumber>E2E123</AccountNumber>
                <AccountType>CC</AccountType>
                <CurrentBalance>1000</CurrentBalance>
              </Account>
            </Accounts>
          </CreditProfile>
        </INProfileResponse>`;

      const testFilePath = path.join(process.cwd(), 'tests', 'integration-e2e.xml');

      try {
        fs.writeFileSync(testFilePath, testXmlContent);

        // Upload the file
        const uploadResponse = await request(app)
          .post('/api/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(uploadResponse.body.success).toBe(true);

        // Step 2: List reports (should still be empty due to mocking)
        const listResponse = await request(app)
          .get('/api/reports')
          .expect(200);

        expect(listResponse.body.success).toBe(true);
        expect(listResponse.body.data.reports).toEqual([]);

        // Step 3: Get stats (should still be zero due to mocking)
        const statsResponse = await request(app)
          .get('/api/reports/stats')
          .expect(200);

        expect(statsResponse.body.success).toBe(true);
        expect(statsResponse.body.data.overview.totalReports).toBe(0);

      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should handle concurrent uploads gracefully', async () => {
      const testXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <INProfileResponse>
          <Header>
            <ReportDate>2024-01-01</ReportDate>
            <ReportTime>12:00:00</ReportTime>
          </Header>
          <CreditProfile>
            <Applicant>
              <ApplicantFirstName>Concurrent</ApplicantFirstName>
              <ApplicantLastName>Test</ApplicantLastName>
            </Applicant>
          </CreditProfile>
        </INProfileResponse>`;

      const testFiles = [];
      const uploadPromises = [];

      try {
        // Create multiple test files
        for (let i = 0; i < 3; i++) {
          const testFilePath = path.join(process.cwd(), 'tests', `integration-concurrent-${i}.xml`);
          testFiles.push(testFilePath);
          fs.writeFileSync(testFilePath, testXmlContent);

          // Create upload promises
          uploadPromises.push(
            request(app)
              .post('/api/upload')
              .attach('file', testFilePath)
              .expect(201)
          );
        }

        // Execute all uploads concurrently
        const responses = await Promise.all(uploadPromises);

        // Verify all uploads succeeded
        responses.forEach(response => {
          expect(response.body.success).toBe(true);
          expect(response.body.message).toContain('processed');
        });

      } finally {
        // Clean up all test files
        testFiles.forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });
  });
});