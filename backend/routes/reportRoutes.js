import express from 'express';
import { upload, handleUploadError } from '../middlewares/upload.js';
import {
  uploadReport,
  getReports,
  getReport,
  deleteReport,
  getReportStats
} from '../controllers/reportController.js';

const router = express.Router();

// Upload XML file
router.post('/upload', upload, handleUploadError, uploadReport);

// Get all reports
router.get('/reports', getReports);

// Get report statistics
router.get('/reports/stats', getReportStats);

// Get specific report
router.get('/reports/:id', getReport);

// Delete report
router.delete('/reports/:id', deleteReport);

export default router;
