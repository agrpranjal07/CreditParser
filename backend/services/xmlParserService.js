import { XMLParser } from 'fast-xml-parser';
import { promises as fs } from 'fs';
import logger from '../utils/logger.js';

// Configure XML parser options
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  ignoreNameSpace: false,
  removeNSPrefix: false,
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  parseTrueNumberOnly: false,
  arrayMode: false,
  stopNodes: ["*.#text"]
};

const parser = new XMLParser(parserOptions);

/**
 * Parse XML file and return structured data
 * @param {string} filePath - Path to XML file
 * @returns {Promise<Object>} Parsed XML data
 */
const parseXmlFile = async (filePath) => {
  try {
    // Read file content
    const xmlContent = await fs.readFile(filePath, 'utf8');
    
    // Validate XML content
    if (!xmlContent || xmlContent.trim().length === 0) {
      const error = new Error('XML file is empty');
      error.name = 'XMLParsingError';
      throw error;
    }

    // Parse XML
    const parsedData = parser.parse(xmlContent);
    
    if (!parsedData) {
      const error = new Error('Failed to parse XML content');
      error.name = 'XMLParsingError';
      throw error;
    }

    logger.info('XML file parsed successfully', { filePath });
    return parsedData;
    
  } catch (error) {
    logger.error('XML parsing failed', { filePath, error: error.message });
    
    if (error.name === 'XMLParsingError') {
      throw error;
    }
    
    const xmlError = new Error(`XML parsing failed: ${error.message}`);
    xmlError.name = 'XMLParsingError';
    throw xmlError;
  }
};

/**
 * Validate XML structure for Experian credit report
 * @param {Object} parsedData - Parsed XML data
 * @returns {boolean} True if valid Experian XML
 */
const validateExperianXml = (parsedData) => {
  try {
    // Basic structure validation
    if (!parsedData || typeof parsedData !== 'object') {
      return false;
    }

    // Look for Experian-specific XML root elements and structures
    const rootKeys = Object.keys(parsedData);
    const experianIndicators = [
      'INProfileResponse',  // Real Experian format
      'CreditReport',
      'CREDITREPORT',
      'ExpCreditReport',
      'Report',
      'XMLResponse'
    ];

    const hasExperianRoot = rootKeys.some(key => 
      experianIndicators.some(indicator => 
        key.toLowerCase().includes(indicator.toLowerCase())
      )
    );

    if (!hasExperianRoot) {
      logger.warn('XML does not appear to be an Experian credit report');
      return false;
    }

    // Additional validation for INProfileResponse format
    if (parsedData.INProfileResponse) {
      const profileResponse = parsedData.INProfileResponse;
      
      // Check for essential Experian sections
      const hasRequiredSections = 
        profileResponse.Header ||
        profileResponse.CAIS_Account ||
        profileResponse.Current_Application;
        
      if (!hasRequiredSections) {
        logger.warn('Missing required Experian credit report sections');
        return false;
      }
    }

    return true;
    
  } catch (error) {
    logger.error('XML validation failed', { error: error.message });
    return false;
  }
};

/**
 * Extract text content from XML node
 * @param {*} node - XML node
 * @returns {string} Extracted text
 */
const extractText = (node) => {
  if (!node) return '';
  if (typeof node === 'string') return node.trim();
  if (typeof node === 'number') return node.toString();
  if (node['#text']) return node['#text'].toString().trim();
  if (typeof node === 'object' && !Array.isArray(node)) {
    const values = Object.values(node);
    return values.find(val => typeof val === 'string') || '';
  }
  return '';
};

/**
 * Extract number from XML node
 * @param {*} node - XML node
 * @returns {number} Extracted number
 */
const extractNumber = (node) => {
  const text = extractText(node);
  const number = parseFloat(text.replace(/[^0-9.-]/g, ''));
  return isNaN(number) ? 0 : number;
};

/**
 * Extract date from XML node
 * @param {*} node - XML node
 * @returns {Date|null} Extracted date
 */
const extractDate = (node) => {
  const text = extractText(node);
  if (!text) return null;
  
  const date = new Date(text);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Safely navigate XML object path
 * @param {Object} obj - XML object
 * @param {string} path - Dot notation path
 * @returns {*} Value at path or undefined
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

export {
  parseXmlFile,
  validateExperianXml,
  extractText,
  extractNumber,
  extractDate,
  getNestedValue
};
