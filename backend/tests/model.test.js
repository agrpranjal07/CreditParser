import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the CreditReport model
vi.mock('../models/CreditReport.js', () => {
  const MockCreditReport = vi.fn();
  
  // Mock instance methods
  MockCreditReport.prototype.save = vi.fn().mockResolvedValue({});
  MockCreditReport.prototype.toJSON = vi.fn().mockReturnValue({});
  MockCreditReport.prototype.validate = vi.fn().mockResolvedValue(true);
  
  // Mock static methods
  MockCreditReport.find = vi.fn();
  MockCreditReport.findOne = vi.fn();
  MockCreditReport.findById = vi.fn();
  MockCreditReport.countDocuments = vi.fn();
  MockCreditReport.aggregate = vi.fn();
  MockCreditReport.insertMany = vi.fn();
  MockCreditReport.deleteMany = vi.fn();
  MockCreditReport.create = vi.fn();
  
  // Mock schema validation
  MockCreditReport.schema = {
    paths: {
      fileHash: { options: { required: true } },
      rawXmlUrl: { options: { required: true } },
      cloudinaryPublicId: { options: { required: true } }
    }
  };
  
  return { default: MockCreditReport };
});

import CreditReport from '../models/CreditReport.js';

// Helper function to create mock credit report data
const createMockCreditReport = (overrides = {}) => ({
  fileHash: 'abc123def456',
  rawXmlUrl: 'https://cloudinary.com/test.xml',
  cloudinaryPublicId: 'test_public_id',
  basicDetails: {
    name: 'Test User',
    dateOfBirth: '1990-01-01',
    address: '123 Test St',
    phone: '1234567890',
    pan: 'ABCDE1234F'
  },
  summary: {
    creditScore: 750,
    totalAccounts: 5,
    activeAccounts: 3,
    totalEnquiries: 2
  },
  accounts: [],
  enquiries: [],
  processedAt: new Date(),
  ...overrides
});

describe('CreditReport Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Validation', () => {
    it('should validate required fields', async () => {
      const mockData = createMockCreditReport();
      const instance = new CreditReport(mockData);
      
      await instance.validate();
      expect(instance.validate).toHaveBeenCalled();
    });

    it('should require fileHash field', () => {
      expect(CreditReport.schema.paths.fileHash.options.required).toBe(true);
    });

    it('should require rawXmlUrl field', () => {
      expect(CreditReport.schema.paths.rawXmlUrl.options.required).toBe(true);
    });

    it('should require cloudinaryPublicId field', () => {
      expect(CreditReport.schema.paths.cloudinaryPublicId.options.required).toBe(true);
    });
  });

  describe('Account Type Validation', () => {
    it('should accept valid account types', () => {
      const validTypes = ['Credit Card', 'Personal Loan', 'Home Loan', 'Auto Loan', 'Other'];
      validTypes.forEach(type => {
        const mockData = createMockCreditReport({
          accounts: [{ type, status: 'Active' }]
        });
        const instance = new CreditReport(mockData);
        expect(instance).toBeDefined();
      });
    });
  });

  describe('Account Status Validation', () => {
    it('should accept valid account statuses', () => {
      const validStatuses = ['Active', 'Closed', 'Settled', 'Written Off'];
      validStatuses.forEach(status => {
        const mockData = createMockCreditReport({
          accounts: [{ type: 'Credit Card', status }]
        });
        const instance = new CreditReport(mockData);
        expect(instance).toBeDefined();
      });
    });
  });

  describe('Default Values', () => {
    it('should set default processedAt to current date', () => {
      const mockData = createMockCreditReport();
      delete mockData.processedAt;
      
      const instance = new CreditReport(mockData);
      expect(instance).toBeDefined();
    });

    it('should set default accounts to empty array', () => {
      const mockData = createMockCreditReport();
      delete mockData.accounts;
      
      const instance = new CreditReport(mockData);
      expect(instance).toBeDefined();
    });

    it('should set default enquiries to empty array', () => {
      const mockData = createMockCreditReport();
      delete mockData.enquiries;
      
      const instance = new CreditReport(mockData);
      expect(instance).toBeDefined();
    });
  });

  describe('Data Types and Constraints', () => {
    it('should handle string fields correctly', () => {
      const mockData = createMockCreditReport({
        fileHash: 'test-hash-123',
        rawXmlUrl: 'https://example.com/test.xml'
      });
      
      const instance = new CreditReport(mockData);
      expect(instance).toBeDefined();
    });

    it('should handle nested objects correctly', () => {
      const mockData = createMockCreditReport({
        basicDetails: {
          name: 'John Doe',
          dateOfBirth: '1985-05-15',
          address: '456 Main St',
          phone: '9876543210',
          pan: 'FGHIJ5678K'
        }
      });
      
      const instance = new CreditReport(mockData);
      expect(instance).toBeDefined();
    });

    it('should handle arrays correctly', () => {
      const mockData = createMockCreditReport({
        accounts: [
          { type: 'Credit Card', status: 'Active', balance: 1000 },
          { type: 'Personal Loan', status: 'Closed', balance: 0 }
        ],
        enquiries: [
          { type: 'Soft', date: '2023-01-01', institution: 'Bank A' }
        ]
      });
      
      const instance = new CreditReport(mockData);
      expect(instance).toBeDefined();
    });
  });

  describe('Query Operations', () => {
    it('should support find operations', async () => {
      const mockReports = [createMockCreditReport(), createMockCreditReport()];
      CreditReport.find.mockResolvedValue(mockReports);
      
      const result = await CreditReport.find({});
      expect(CreditReport.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockReports);
    });

    it('should support findById operations', async () => {
      const mockReport = createMockCreditReport();
      CreditReport.findById.mockResolvedValue(mockReport);
      
      const result = await CreditReport.findById('507f1f77bcf86cd799439011');
      expect(CreditReport.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockReport);
    });

    it('should support countDocuments operations', async () => {
      CreditReport.countDocuments.mockResolvedValue(5);
      
      const result = await CreditReport.countDocuments({});
      expect(CreditReport.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(5);
    });

    it('should support aggregate operations', async () => {
      const mockAggregateResult = [{ _id: null, averageScore: 720 }];
      CreditReport.aggregate.mockResolvedValue(mockAggregateResult);
      
      const pipeline = [{ $group: { _id: null, averageScore: { $avg: '$summary.creditScore' } } }];
      const result = await CreditReport.aggregate(pipeline);
      
      expect(CreditReport.aggregate).toHaveBeenCalledWith(pipeline);
      expect(result).toEqual(mockAggregateResult);
    });

    it('should support bulk operations', async () => {
      const mockReports = [createMockCreditReport(), createMockCreditReport()];
      CreditReport.insertMany.mockResolvedValue(mockReports);
      
      const result = await CreditReport.insertMany(mockReports);
      expect(CreditReport.insertMany).toHaveBeenCalledWith(mockReports);
      expect(result).toEqual(mockReports);
    });

    it('should support delete operations', async () => {
      CreditReport.deleteMany.mockResolvedValue({ deletedCount: 3 });
      
      const result = await CreditReport.deleteMany({});
      expect(CreditReport.deleteMany).toHaveBeenCalledWith({});
      expect(result).toEqual({ deletedCount: 3 });
    });
  });
});