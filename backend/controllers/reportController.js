import crypto from 'crypto';
import { promises as fs } from 'fs';
import CreditReport from '../models/CreditReport.js';
import { uploadXmlFile, deleteXmlFile } from '../config/cloudinary.js';
import { parseXmlFile, validateExperianXml } from '../services/xmlParserService.js';
import { transformCreditReportData } from '../services/dataTransformerService.js';
import logger from '../utils/logger.js';

/**
 * Upload and process XML credit report
 * @route POST /api/upload
 */
const uploadReport = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { path: filePath, originalname: fileName } = req.file;

    logger.info('Processing XML file upload', { fileName, filePath });

    // Generate file hash to prevent duplicates
    const fileBuffer = await fs.readFile(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check if file already exists
    const existingReport = await CreditReport.findOne({ fileHash });
    if (existingReport) {
      // Clean up uploaded file
      await fs.unlink(filePath).catch(() => {});
      
      return res.status(409).json({
        success: false,
        message: 'This file has already been processed',
        reportId: existingReport._id
      });
    }

    // Parse XML file
    const parsedXml = await parseXmlFile(filePath);
    console.log("FileLocation", filePath);
    // Validate XML structure
    if (!validateExperianXml(parsedXml)) {
      await fs.unlink(filePath).catch(() => {});
      return res.status(422).json({
        success: false,
        message: 'Invalid XML format. Please ensure this is a valid Experian credit report.'
      });
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadXmlFile(filePath, fileName);

    // Transform XML data
    const transformedData = transformCreditReportData(parsedXml);

    // Create credit report record
    const creditReport = new CreditReport({
      fileHash,
      rawXmlUrl: cloudinaryResult.url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      ...transformedData
    });

    await creditReport.save();

    // Clean up local file
    await fs.unlink(filePath).catch(() => {});

    logger.info('Credit report processed successfully', { 
      reportId: creditReport._id,
      fileName 
    });

    // Return success response with full report data
    res.status(201).json({
      success: true,
      message: 'Credit report processed successfully',
      data: {
        _id: creditReport._id,
        fileHash: creditReport.fileHash,
        basicDetails: creditReport.basicDetails,
        reportSummary: creditReport.reportSummary,
        creditAccounts: creditReport.creditAccounts,
        enquiries: creditReport.enquiries,
        rawXmlUrl: creditReport.rawXmlUrl,
        createdAt: creditReport.createdAt
      }
    });

  } catch (error) {
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    logger.error('Upload processing failed', { error: error.message });
    next(error);
  }
};

/**
 * Get all credit reports
 * @route GET /api/reports
 */
const getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await CreditReport.countDocuments();

    // Get reports with pagination
    const reports = await CreditReport
      .find()
      .select('basicDetails reportSummary rawXmlUrl createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        reports: reports.map(report => ({
          id: report._id,
          name: report.basicDetails.name,
          creditScore: report.basicDetails.creditScore,
          totalAccounts: report.reportSummary.totalAccounts,
          activeAccounts: report.reportSummary.activeAccounts,
          currentBalance: report.reportSummary.currentBalanceAmount,
          createdAt: report.createdAt,
          rawXmlUrl: report.rawXmlUrl
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalReports: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch reports', { error: error.message });
    next(error);
  }
};

/**
 * Get specific credit report by ID
 * @route GET /api/reports/:id
 */
const getReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await CreditReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Credit report not found'
      });
    }

    logger.info('Credit report retrieved', { reportId: id });

    res.json({
      success: true,
      data: {
        id: report._id,
        basicDetails: report.basicDetails,
        reportSummary: report.reportSummary,
        creditAccounts: report.creditAccounts,
        enquiries: report.enquiries,
        rawXmlUrl: report.rawXmlUrl,
        accountSummary: report.accountSummary,
        totalDebt: report.totalDebt,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      }
    });

  } catch (error) {
    logger.error('Failed to fetch report', { reportId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Delete credit report
 * @route DELETE /api/reports/:id
 */
const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await CreditReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Credit report not found'
      });
    }

    // Delete from Cloudinary
    await deleteXmlFile(report.cloudinaryPublicId).catch(() => {
      logger.warn('Failed to delete file from Cloudinary', { publicId: report.cloudinaryPublicId });
    });

    // Delete from database
    await CreditReport.findByIdAndDelete(id);

    logger.info('Credit report deleted', { reportId: id });

    res.json({
      success: true,
      message: 'Credit report deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete report', { reportId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Get credit report statistics
 * @route GET /api/reports/stats
 */
const getReportStats = async (req, res, next) => {
  try {
    const stats = await CreditReport.aggregate([
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          avgCreditScore: { $avg: '$basicDetails.creditScore' },
          totalAccounts: { $sum: '$reportSummary.totalAccounts' },
          totalBalance: { $sum: '$reportSummary.currentBalanceAmount' }
        }
      }
    ]);

    const recentReports = await CreditReport
      .find()
      .select('createdAt')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalReports: 0,
          avgCreditScore: 0,
          totalAccounts: 0,
          totalBalance: 0
        },
        recentActivity: recentReports.map(report => ({
          date: report.createdAt.toISOString().split('T')[0],
          count: 1
        }))
      }
    });

  } catch (error) {
    logger.error('Failed to fetch report stats', { error: error.message });
    next(error);
  }
};

export {
  uploadReport,
  getReports,
  getReport,
  deleteReport,
  getReportStats
};
