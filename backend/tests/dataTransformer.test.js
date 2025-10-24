import { describe, it, expect } from 'vitest';
import { transformCreditReportData as transformParsedData } from '../services/dataTransformerService.js';

describe('Data Transformer Service', () => {
  describe('transformParsedData', () => {
    it('should transform complete Experian XML data correctly', () => {
      const parsedData = {
        INProfileResponse: {
          Current_Application: {
            Current_Application_Details: {
              Current_Applicant_Details: {
                First_Name: 'John',
                Last_Name: 'Doe',
                MobilePhoneNumber: '9876543210',
                IncomeTaxPan: 'ABCDE1234F',
                Date_Of_Birth_Applicant: '19900515',
                EMailId: 'john.doe@example.com'
              },
              Current_Applicant_Address_Details: {
                FlatNoPlotNoHouseNo: '123',
                BldgNoSocietyName: 'Test Building',
                RoadNoNameAreaLocality: 'Test Street',
                City: 'Mumbai',
                State: 'Maharashtra',
                PINCode: '400001'
              }
            }
          },
          SCORE: {
            BureauScore: '750'
          },
          CAIS_Account: {
            CAIS_Summary: {
              Credit_Account: {
                CreditAccountTotal: '2',
                CreditAccountActive: '2',
                CreditAccountClosed: '0'
              },
              Total_Outstanding_Balance: {
                Outstanding_Balance_All: '75000',
                Outstanding_Balance_Secured: '25000',
                Outstanding_Balance_UnSecured: '50000'
              }
            },
            CAIS_Account_DETAILS: [
              {
                Account_Type: '10',
                Portfolio_Type: 'R',
                Subscriber_Name: 'Test Bank',
                Account_Number: '1234****5678',
                Account_Status: '11',
                Current_Balance: '50000',
                Amount_Past_Due: '0',
                Credit_Limit_Amount: '100000',
                Open_Date: '20200101',
                Date_Reported: '20241001',
                Payment_History_Profile: '000000000000'
              },
              {
                Account_Type: '51',
                Portfolio_Type: 'I',
                Subscriber_Name: 'Another Bank',
                Account_Number: '9876****4321',
                Account_Status: '11',
                Current_Balance: '25000',
                Amount_Past_Due: '0',
                Highest_Credit_or_Original_Loan_Amount: '50000',
                Open_Date: '20210601',
                Date_Reported: '20241001'
              }
            ]
          },
          CAPS: {
            CAPS_Summary: {
              CAPSLast90Days: '2',
              CAPSLast30Days: '1',
              CAPSLast7Days: '0'
            }
          }
        }
      };

      const result = transformParsedData(parsedData);

      // Test basic details
      expect(result.basicDetails.name).toBe('John Doe');
      expect(result.basicDetails.creditScore).toBe(750);
      expect(result.basicDetails.pan).toBe('ABCDE1234F');
      expect(result.basicDetails.mobilePhone).toBe('9876543210');
      expect(result.basicDetails.address).toContain('Mumbai');

      // Test report summary
      expect(result.reportSummary.totalAccounts).toBe(2);
      expect(result.reportSummary.activeAccounts).toBe(2);
      expect(result.reportSummary.currentBalanceAmount).toBe(75000);

      // Test credit accounts
      expect(result.creditAccounts).toHaveLength(2);
      expect(result.creditAccounts[0].bankName).toBe('Test Bank');
      expect(result.creditAccounts[0].type).toBe('Credit Card (Revolving)');
      expect(result.creditAccounts[0].currentBalance).toBe(50000);
      expect(result.creditAccounts[0].status).toBe('Active - Regular');

      // Test enquiries
      expect(result.enquiries).toHaveLength(1);
      expect(result.enquiries[0].institution).toBe('Various Institutions');
      expect(result.enquiries[0].purpose).toContain('2 enquiries in last 90 days');
    });

    it('should handle minimal data structure', () => {
      const parsedData = {
        INProfileResponse: {
          Current_Application: {
            Current_Application_Details: {
              Current_Applicant_Details: {
                First_Name: 'Jane',
                Last_Name: 'Smith',
                IncomeTaxPan: 'FGHIJ5678K'
              }
            }
          }
        }
      };

      const result = transformParsedData(parsedData);

      expect(result.basicDetails.name).toBe('Jane Smith');
      expect(result.basicDetails.pan).toBe('FGHIJ5678K');
      expect(result.basicDetails.creditScore).toBeUndefined();
      expect(result.reportSummary.totalAccounts).toBe(0);
      expect(result.creditAccounts).toHaveLength(0);
      expect(result.enquiries).toHaveLength(0);
    });

    it('should handle single account (not array)', () => {
      const parsedData = {
        INProfileResponse: {
          CAIS_Account: {
            CAIS_Account_DETAILS: {
              Account_Type: '10',
              Portfolio_Type: 'R',
              Subscriber_Name: 'Single Bank',
              Account_Number: '1111****1111',
              Account_Status: '11',
              Current_Balance: '30000',
              Amount_Past_Due: '0',
              Credit_Limit_Amount: '50000',
              Open_Date: '20200101',
              Date_Reported: '20241001'
            }
          }
        }
      };

      const result = transformParsedData(parsedData);

      expect(result.creditAccounts).toHaveLength(1);
      expect(result.creditAccounts[0].bankName).toBe('Single Bank');
      expect(result.reportSummary.totalAccounts).toBe(1);
      expect(result.reportSummary.currentBalanceAmount).toBe(30000);
    });

    it('should handle single enquiry (not array)', () => {
      const parsedData = {
        INProfileResponse: {
          CAPS: {
            CAPS_Summary: {
              CAPSLast90Days: '1',
              CAPSLast30Days: '1',
              CAPSLast7Days: '0'
            }
          }
        }
      };

      const result = transformParsedData(parsedData);

      expect(result.enquiries).toHaveLength(1);
      expect(result.enquiries[0].institution).toBe('Various Institutions');
      expect(result.enquiries[0].purpose).toContain('1 enquiries in last 90 days');
      expect(result.reportSummary.recentEnquiries).toBe(1);
    });

    it('should map account types correctly', () => {
      const testCases = [
        { accountType: '10', portfolioType: 'R', expected: 'Credit Card (Revolving)' },
        { accountType: '51', portfolioType: 'I', expected: 'Personal Loan (Installment)' },
        { accountType: '53', portfolioType: 'I', expected: 'Auto Loan (Installment)' },
        { accountType: '61', portfolioType: 'I', expected: 'Housing Loan (Installment)' },
        { accountType: '99', portfolioType: 'I', expected: 'Other (Installment)' }
      ];

      testCases.forEach(testCase => {
        const parsedData = {
          INProfileResponse: {
            CAIS_Account: {
              CAIS_Account_DETAILS: {
                Account_Type: testCase.accountType,
                Portfolio_Type: testCase.portfolioType,
                Subscriber_Name: 'Test Bank',
                Account_Number: '1234****5678',
                Account_Status: '11',
                Current_Balance: '10000',
                Open_Date: '20200101',
                Date_Reported: '20241001'
              }
            }
          }
        };

        const result = transformParsedData(parsedData);
        expect(result.creditAccounts[0].type).toBe(testCase.expected);
      });
    });

    it('should map payment statuses correctly', () => {
      const testCases = [
        { status: '11', expected: 'Active - Regular' },
        { status: '21', expected: 'Active - Irregular' },
        { status: '22', expected: 'Active - Irregular' },
        { status: '23', expected: 'Status 23' }, // Not mapped, falls back to default
        { status: '71', expected: 'Active - Irregular' },
        { status: '13', expected: 'Closed - Regular' },
        { status: '99', expected: 'Status 99' } // Not mapped, falls back to default
      ];

      testCases.forEach(testCase => {
        const parsedData = {
          INProfileResponse: {
            CAIS_Account: {
              CAIS_Account_DETAILS: {
                Account_Type: '10',
                Portfolio_Type: 'R',
                Subscriber_Name: 'Test Bank',
                Account_Number: '1234****5678',
                Account_Status: testCase.status,
                Current_Balance: '10000',
                Open_Date: '20200101',
                Date_Reported: '20241001'
              }
            }
          }
        };

        const result = transformParsedData(parsedData);
        expect(result.creditAccounts[0].status).toBe(testCase.expected);
      });
    });

    it('should handle missing nested structures gracefully', () => {
      const parsedData = {
        INProfileResponse: {}
      };

      const result = transformParsedData(parsedData);

      expect(result.basicDetails.name).toBe('');
      expect(result.basicDetails.creditScore).toBeUndefined();
      expect(result.reportSummary.totalAccounts).toBe(0);
      expect(result.creditAccounts).toHaveLength(0);
      expect(result.enquiries).toHaveLength(0);
    });

    it('should calculate active accounts correctly', () => {
      const parsedData = {
        INProfileResponse: {
          CAIS_Account: {
            CAIS_Account_DETAILS: [
              {
                Account_Type: '10',
                Portfolio_Type: 'R',
                Subscriber_Name: 'Bank 1',
                Account_Number: '1111****1111',
                Account_Status: '11', // Active
                Current_Balance: '10000',
                Open_Date: '20200101',
                Date_Reported: '20241001'
              },
              {
                Account_Type: '51',
                Portfolio_Type: 'I',
                Subscriber_Name: 'Bank 2',
                Account_Number: '2222****2222',
                Account_Status: '11', // Active
                Current_Balance: '20000',
                Open_Date: '20210101',
                Date_Reported: '20241001'
              },
              {
                Account_Type: '10',
                Portfolio_Type: 'R',
                Subscriber_Name: 'Bank 3',
                Account_Number: '3333****3333',
                Account_Status: '71', // Closed
                Current_Balance: '0',
                Open_Date: '20190101',
                Date_Closed: '20220101',
                Date_Reported: '20241001'
              }
            ]
          }
        }
      };

      const result = transformParsedData(parsedData);

      expect(result.reportSummary.totalAccounts).toBe(3);
      expect(result.reportSummary.activeAccounts).toBe(3);
    });

    it('should handle date formatting', () => {
      const parsedData = {
        INProfileResponse: {
          CAIS_Account: {
            CAIS_Account_DETAILS: {
              Account_Type: '10',
              Portfolio_Type: 'R',
              Subscriber_Name: 'Test Bank',
              Account_Number: '1234****5678',
              Account_Status: '11',
              Current_Balance: '50000',
              Open_Date: '20241015',
              Date_Reported: '20241020'
            }
          }
        }
      };

      const result = transformParsedData(parsedData);

      expect(result.creditAccounts[0].dateOpened).toBeInstanceOf(Date);
      expect(result.creditAccounts[0].dateOpened.getFullYear()).toBe(2024);
      expect(result.creditAccounts[0].dateOpened.getMonth()).toBe(9); // October (0-indexed)
      expect(result.creditAccounts[0].dateOpened.getDate()).toBe(15);
    });
  });
});
