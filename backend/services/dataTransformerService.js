import logger from '../utils/logger.js';
import { extractText, extractNumber, extractDate, getNestedValue } from './xmlParserService.js';

/**
 * Transform parsed XML into structured credit report data
 * @param {Object} parsedXml - Parsed XML data
 * @returns {Object} Transformed credit report data
 */
const transformCreditReportData = (parsedXml) => {
  try {
    // Find the root credit report element
    const reportRoot = findReportRoot(parsedXml);
    
    if (!reportRoot) {
      throw new Error('Could not find credit report data in XML');
    }

    // Extract different sections
    const basicDetails = extractBasicDetails(reportRoot);
    const reportSummary = extractReportSummary(reportRoot);
    const creditAccounts = extractCreditAccounts(reportRoot);
    const enquiries = extractEnquiries(reportRoot);

    const transformedData = {
      basicDetails,
      reportSummary,
      creditAccounts,
      enquiries,
      reportDate: new Date()
    };

    logger.info('Credit report data transformed successfully', {
      accountsCount: creditAccounts.length,
      enquiriesCount: enquiries.length
    });

    return transformedData;

  } catch (error) {
    logger.error('Data transformation failed', { error: error.message });
    throw new Error(`Data transformation failed: ${error.message}`);
  }
};

/**
 * Find the root element containing credit report data
 * @param {Object} parsedXml - Parsed XML data
 * @returns {Object|null} Report root element
 */
const findReportRoot = (parsedXml) => {
  // Handle Experian INProfileResponse format (real format)
  if (parsedXml.INProfileResponse) {
    return parsedXml.INProfileResponse;
  }

  // Handle other possible formats
  const possibleRoots = [
    'CreditReport',
    'CREDITREPORT',
    'ExpCreditReport',
    'Report',
    'XMLResponse.CreditReport',
    'XMLResponse.Response.CreditReport'
  ];

  for (const rootPath of possibleRoots) {
    const root = getNestedValue(parsedXml, rootPath);
    if (root) {
      return root;
    }
  }

  // If no specific root found, return the first object-type value
  const keys = Object.keys(parsedXml);
  for (const key of keys) {
    if (typeof parsedXml[key] === 'object' && parsedXml[key] !== null) {
      return parsedXml[key];
    }
  }

  return null;
};

/**
 * Extract basic personal details
 * @param {Object} reportRoot - Report root element
 * @returns {Object} Basic details
 */
const extractBasicDetails = (reportRoot) => {
  const basicDetails = {};

  // Handle Experian INProfileResponse format
  if (reportRoot.Current_Application) {
    const applicantDetails = reportRoot.Current_Application.Current_Application_Details?.Current_Applicant_Details;
    
    if (applicantDetails) {
      // Extract name (combine first and last name)
      const firstName = extractText(applicantDetails.First_Name) || '';
      const lastName = extractText(applicantDetails.Last_Name) || '';
      basicDetails.name = `${firstName} ${lastName}`.trim();
      
      // Extract phone
      basicDetails.mobilePhone = extractText(applicantDetails.MobilePhoneNumber) || 
                                  extractText(applicantDetails.Telephone_Number_Applicant_1st) || '';
      
      // Extract PAN
      basicDetails.pan = extractText(applicantDetails.IncomeTaxPan) || '';
      
      // Extract email
      basicDetails.email = extractText(applicantDetails.EMailId) || '';
      
      // Extract date of birth
      const dobString = extractText(applicantDetails.Date_Of_Birth_Applicant);
      if (dobString && dobString !== '00010201') {
        // Convert YYYYMMDD format to date
        const year = dobString.substring(0, 4);
        const month = dobString.substring(4, 6);
        const day = dobString.substring(6, 8);
        if (year !== '0001') {
          basicDetails.dateOfBirth = new Date(`${year}-${month}-${day}`);
        }
      }
    }

    // Extract address
    const addressDetails = reportRoot.Current_Application.Current_Application_Details?.Current_Applicant_Address_Details;
    if (addressDetails) {
      const addressParts = [
        extractText(addressDetails.FlatNoPlotNoHouseNo),
        extractText(addressDetails.BldgNoSocietyName),
        extractText(addressDetails.RoadNoNameAreaLocality),
        extractText(addressDetails.City),
        extractText(addressDetails.State),
        extractText(addressDetails.PINCode)
      ].filter(part => part && part.trim() !== '');
      
      basicDetails.address = addressParts.join(', ');
    }
  }

  // Extract credit score from SCORE section
  if (reportRoot.SCORE) {
    const score = extractNumber(reportRoot.SCORE.BureauScore);
    basicDetails.creditScore = score > 0 ? score : null;
  }

  // Extract additional details from CAIS account holder details if available
  if (reportRoot.CAIS_Account?.CAIS_Account_DETAILS) {
    const caisDetails = Array.isArray(reportRoot.CAIS_Account.CAIS_Account_DETAILS) 
      ? reportRoot.CAIS_Account.CAIS_Account_DETAILS[0] 
      : reportRoot.CAIS_Account.CAIS_Account_DETAILS;
      
    if (caisDetails?.CAIS_Holder_Details) {
      const holderDetails = caisDetails.CAIS_Holder_Details;
      
      // Use CAIS holder details if current application details are missing
      if (!basicDetails.name) {
        const firstName = extractText(holderDetails.First_Name_Non_Normalized) || '';
        const lastName = extractText(holderDetails.Surname_Non_Normalized) || '';
        basicDetails.name = `${firstName} ${lastName}`.trim();
      }
      
      if (!basicDetails.pan) {
        basicDetails.pan = extractText(holderDetails.Income_TAX_PAN) || '';
      }
      
      if (!basicDetails.dateOfBirth && holderDetails.Date_of_birth) {
        const dobString = extractText(holderDetails.Date_of_birth);
        if (dobString && dobString.length === 8) {
          const year = dobString.substring(0, 4);
          const month = dobString.substring(4, 6);
          const day = dobString.substring(6, 8);
          basicDetails.dateOfBirth = new Date(`${year}-${month}-${day}`);
        }
      }
      
      // Extract gender
      const genderCode = extractText(holderDetails.Gender_Code);
      if (genderCode === '1') {
        basicDetails.gender = 'Male';
      } else if (genderCode === '2') {
        basicDetails.gender = 'Female';
      }
    }
    
    // Extract phone from CAIS holder phone details
    if (caisDetails?.CAIS_Holder_Phone_Details && !basicDetails.mobilePhone) {
      const phoneDetails = caisDetails.CAIS_Holder_Phone_Details;
      basicDetails.mobilePhone = extractText(phoneDetails.Telephone_Number) || 
                                  extractText(phoneDetails.Mobile_Telephone_Number) || '';
    }
    
    // Extract address from CAIS holder address details
    if (caisDetails?.CAIS_Holder_Address_Details && !basicDetails.address) {
      const addrDetails = caisDetails.CAIS_Holder_Address_Details;
      const addressParts = [
        extractText(addrDetails.First_Line_Of_Address_non_normalized),
        extractText(addrDetails.Second_Line_Of_Address_non_normalized),
        extractText(addrDetails.Third_Line_Of_Address_non_normalized),
        extractText(addrDetails.City_non_normalized),
        extractText(addrDetails.State_non_normalized),
        extractText(addrDetails.ZIP_Postal_Code_non_normalized)
      ].filter(part => part && part.trim() !== '');
      
      basicDetails.address = addressParts.join(', ');
    }
  }

  // Fallback to legacy format extraction if needed
  if (!basicDetails.name) {
    const namePaths = [
      'PersonalInfo.Name',
      'PersonalInformation.Name',
      'ApplicantInfo.Name',
      'Consumer.Name',
      'Header.SubjectName'
    ];
    basicDetails.name = findValueFromPaths(reportRoot, namePaths) || '';
  }

  return basicDetails;
};

/**
 * Extract report summary information
 * @param {Object} reportRoot - Report root element
 * @returns {Object} Report summary
 */
const extractReportSummary = (reportRoot) => {
  const summary = {
    totalAccounts: 0,
    activeAccounts: 0,
    closedAccounts: 0,
    currentBalanceAmount: 0,
    securedAmount: 0,
    unsecuredAmount: 0,
    recentEnquiries: 0
  };

  // Handle Experian INProfileResponse format
  if (reportRoot.CAIS_Account?.CAIS_Summary) {
    const caisSummary = reportRoot.CAIS_Account.CAIS_Summary;
    
    // Extract summary from Credit_Account section
    if (caisSummary.Credit_Account) {
      summary.totalAccounts = extractNumber(caisSummary.Credit_Account.CreditAccountTotal) || 0;
      summary.activeAccounts = extractNumber(caisSummary.Credit_Account.CreditAccountActive) || 0;
      summary.closedAccounts = extractNumber(caisSummary.Credit_Account.CreditAccountClosed) || 0;
    }
    
    // Extract outstanding balance information
    if (caisSummary.Total_Outstanding_Balance) {
      const outstandingBalance = caisSummary.Total_Outstanding_Balance;
      summary.securedAmount = extractNumber(outstandingBalance.Outstanding_Balance_Secured) || 0;
      summary.unsecuredAmount = extractNumber(outstandingBalance.Outstanding_Balance_UnSecured) || 0;
      summary.currentBalanceAmount = extractNumber(outstandingBalance.Outstanding_Balance_All) || 0;
    }
  }

  // Extract account details to calculate additional summary
  if (reportRoot.CAIS_Account?.CAIS_Account_DETAILS) {
    const accountDetails = reportRoot.CAIS_Account.CAIS_Account_DETAILS;
    const accountsArray = Array.isArray(accountDetails) ? accountDetails : [accountDetails];
    
    // If summary totals are not available, calculate from individual accounts
    if (summary.totalAccounts === 0) {
      summary.totalAccounts = accountsArray.length;
      
      accountsArray.forEach(account => {
        const status = extractText(account.Account_Status);
        const currentBalance = extractNumber(account.Current_Balance) || 0;
        
        // Account status codes: 11=Active, 13=Closed, etc.
        if (status === '11' || status === '53' || status === '71') {
          summary.activeAccounts++;
        } else if (status === '13') {
          summary.closedAccounts++;
        }
        
        // Add to current balance
        summary.currentBalanceAmount += currentBalance;
        
        // Categorize by portfolio type: R=Revolving (Unsecured), I=Installment
        const portfolioType = extractText(account.Portfolio_Type);
        if (portfolioType === 'R') {
          summary.unsecuredAmount += currentBalance;
        } else {
          summary.securedAmount += currentBalance;
        }
      });
    }
  }

  // Extract enquiries count
  if (reportRoot.CAPS?.CAPS_Summary) {
    const capsSummary = reportRoot.CAPS.CAPS_Summary;
    summary.recentEnquiries = extractNumber(capsSummary.CAPSLast90Days) || 0;
  }

  // Handle legacy format if Experian format not found
  if (summary.totalAccounts === 0) {
    const accountsPaths = [
      'Accounts',
      'CreditAccounts',
      'AccountInfo',
      'TradeLines'
    ];

    const accounts = findValueFromPaths(reportRoot, accountsPaths);
    
    if (accounts) {
      const accountsArray = Array.isArray(accounts) ? accounts : [accounts];
      
      summary.totalAccounts = accountsArray.length;
      
      accountsArray.forEach(account => {
        const status = extractText(getNestedValue(account, 'Status') || getNestedValue(account, 'AccountStatus'));
        
        if (status && (status.toLowerCase().includes('active') || status.toLowerCase().includes('current'))) {
          summary.activeAccounts++;
        } else if (status && status.toLowerCase().includes('closed')) {
          summary.closedAccounts++;
        }

        const balance = extractNumber(getNestedValue(account, 'CurrentBalance') || getNestedValue(account, 'Balance'));
        summary.currentBalanceAmount += balance;

        const accountType = extractText(getNestedValue(account, 'Type') || getNestedValue(account, 'AccountType'));
        if (accountType && accountType.toLowerCase().includes('secured')) {
          summary.securedAmount += balance;
        } else {
          summary.unsecuredAmount += balance;
        }
      });
    }

    // Find enquiries for legacy format
    const enquiriesPaths = [
      'Enquiries',
      'CreditEnquiries',
      'InquiryInfo'
    ];

    const enquiries = findValueFromPaths(reportRoot, enquiriesPaths);
    if (enquiries) {
      const enquiriesArray = Array.isArray(enquiries) ? enquiries : [enquiries];
      summary.recentEnquiries = enquiriesArray.length;
    }
  }

  return summary;
};

/**
 * Extract credit accounts information
 * @param {Object} reportRoot - Report root element
 * @returns {Array} Credit accounts
 */
const extractCreditAccounts = (reportRoot) => {
  let accounts = [];

  // Handle Experian INProfileResponse format
  if (reportRoot.CAIS_Account?.CAIS_Account_DETAILS) {
    const accountDetails = reportRoot.CAIS_Account.CAIS_Account_DETAILS;
    const accountsArray = Array.isArray(accountDetails) ? accountDetails : [accountDetails];
    
    accounts = accountsArray.map(account => {
      const accountType = extractText(account.Account_Type);
      const portfolioType = extractText(account.Portfolio_Type);
      
      // Map account type codes to readable names
      const getAccountTypeString = (typeCode, portfolio) => {
        const typeMap = {
          '10': 'Credit Card',
          '51': 'Personal Loan',
          '52': 'Personal Loan', 
          '53': 'Auto Loan',
          '61': 'Housing Loan',
          '71': 'Gold Loan',
          '81': 'Two Wheeler Loan'
        };
        
        let type = typeMap[typeCode] || 'Other';
        if (portfolio === 'R') type += ' (Revolving)';
        if (portfolio === 'I') type += ' (Installment)';
        
        return type;
      };
      
      // Map account status codes
      const getAccountStatus = (statusCode) => {
        const statusMap = {
          '11': 'Active - Regular',
          '12': 'Active - Regular', 
          '13': 'Closed - Regular',
          '14': 'Closed - Regular',
          '21': 'Active - Irregular',
          '22': 'Active - Irregular',
          '31': 'Active - Irregular',
          '32': 'Active - Irregular',
          '41': 'Active - Irregular',
          '42': 'Active - Irregular',
          '51': 'Active - Irregular',
          '52': 'Active - Irregular',
          '53': 'Active - Irregular',
          '71': 'Active - Irregular',
          '78': 'Settled',
          '80': 'Settled',
          '82': 'Settled',
          '83': 'Settled', 
          '84': 'Settled',
          '89': 'Closed'
        };
        return statusMap[statusCode] || `Status ${statusCode}`;
      };
      
      // Convert date from YYYYMMDD format
      const convertDate = (dateString) => {
        if (!dateString || dateString.length !== 8) return null;
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return new Date(`${year}-${month}-${day}`);
      };
      
      return {
        type: getAccountTypeString(accountType, portfolioType),
        bankName: extractText(account.Subscriber_Name)?.trim() || 'Unknown Bank',
        accountNumber: extractText(account.Account_Number) || 'N/A',
        address: '', // Not available in this format
        amountOverdue: extractNumber(account.Amount_Past_Due) || 0,
        currentBalance: extractNumber(account.Current_Balance) || 0,
        sanctionedAmount: extractNumber(account.Credit_Limit_Amount) || 
                         extractNumber(account.Highest_Credit_or_Original_Loan_Amount) || 0,
        dateOpened: convertDate(extractText(account.Open_Date)),
        dateClosed: convertDate(extractText(account.Date_Closed)),
        status: getAccountStatus(extractText(account.Account_Status)),
        paymentHistory: extractText(account.Payment_History_Profile) || '',
        paymentRating: extractText(account.Payment_Rating) || '0',
        portfolioType: portfolioType,
        lastReported: convertDate(extractText(account.Date_Reported))
      };
    });
  }

  // Handle legacy format if Experian format not found
  if (accounts.length === 0) {
    const accountsPaths = [
      'Accounts',
      'CreditAccounts',
      'AccountInfo',
      'TradeLines'
    ];

    const accountsData = findValueFromPaths(reportRoot, accountsPaths);
    
    if (accountsData) {
      const accountsArray = Array.isArray(accountsData) ? accountsData : [accountsData];
      
      accounts = accountsArray.map(account => ({
        type: extractText(getNestedValue(account, 'Type') || getNestedValue(account, 'AccountType')) || 'Other',
        bankName: extractText(getNestedValue(account, 'BankName') || getNestedValue(account, 'Institution') || getNestedValue(account, 'Creditor')),
        accountNumber: extractText(getNestedValue(account, 'AccountNumber') || getNestedValue(account, 'AccNum')),
        address: extractText(getNestedValue(account, 'Address')),
        amountOverdue: extractNumber(getNestedValue(account, 'AmountOverdue') || getNestedValue(account, 'PastDue')),
        currentBalance: extractNumber(getNestedValue(account, 'CurrentBalance') || getNestedValue(account, 'Balance')),
        sanctionedAmount: extractNumber(getNestedValue(account, 'SanctionedAmount') || getNestedValue(account, 'CreditLimit')),
        dateOpened: extractDate(getNestedValue(account, 'DateOpened') || getNestedValue(account, 'OpenDate')),
        dateClosed: extractDate(getNestedValue(account, 'DateClosed') || getNestedValue(account, 'CloseDate')),
        status: extractText(getNestedValue(account, 'Status') || getNestedValue(account, 'AccountStatus')) || 'Active',
        paymentHistory: extractText(getNestedValue(account, 'PaymentHistory'))
      }));
    }
  }

  return accounts;
};

/**
 * Extract enquiries information
 * @param {Object} reportRoot - Report root element
 * @returns {Array} Enquiries
 */
const extractEnquiries = (reportRoot) => {
  let enquiries = [];

  // Handle Experian INProfileResponse format
  // Note: The sample XML doesn't have specific enquiry details in a separate section
  // Enquiries are typically in CAPS section but may not have detailed information
  if (reportRoot.CAPS) {
    // For now, we'll create a summary entry based on CAPS data
    const capsSummary = reportRoot.CAPS.CAPS_Summary;
    if (capsSummary) {
      const recent90Days = extractNumber(capsSummary.CAPSLast90Days) || 0;
      const recent30Days = extractNumber(capsSummary.CAPSLast30Days) || 0;
      const recent7Days = extractNumber(capsSummary.CAPSLast7Days) || 0;
      
      if (recent90Days > 0) {
        enquiries.push({
          institution: 'Various Institutions',
          date: new Date(), // Current date as we don't have specific dates
          amount: 0, // Not available in summary
          purpose: `${recent90Days} enquiries in last 90 days (${recent30Days} in last 30 days, ${recent7Days} in last 7 days)`
        });
      }
    }
  }

  // Handle legacy format if available
  if (enquiries.length === 0) {
    const enquiriesPaths = [
      'Enquiries',
      'CreditEnquiries',
      'InquiryInfo'
    ];

    const enquiriesData = findValueFromPaths(reportRoot, enquiriesPaths);
    
    if (enquiriesData) {
      const enquiriesArray = Array.isArray(enquiriesData) ? enquiriesData : [enquiriesData];
      
      enquiries = enquiriesArray.map(enquiry => ({
        institution: extractText(getNestedValue(enquiry, 'Institution') || getNestedValue(enquiry, 'BankName')),
        date: extractDate(getNestedValue(enquiry, 'Date') || getNestedValue(enquiry, 'EnquiryDate')),
        amount: extractNumber(getNestedValue(enquiry, 'Amount') || getNestedValue(enquiry, 'EnquiryAmount')),
        purpose: extractText(getNestedValue(enquiry, 'Purpose') || getNestedValue(enquiry, 'EnquiryPurpose'))
      }));
    }
  }

  return enquiries;
};

/**
 * Find value from multiple possible paths
 * @param {Object} obj - Object to search in
 * @param {Array} paths - Array of possible paths
 * @returns {*} Found value or null
 */
const findValueFromPaths = (obj, paths) => {
  for (const path of paths) {
    const value = getNestedValue(obj, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return null;
};

export {
  transformCreditReportData,
  extractBasicDetails,
  extractReportSummary,
  extractCreditAccounts,
  extractEnquiries
};
