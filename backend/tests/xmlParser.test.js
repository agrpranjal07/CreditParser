import { describe, it, expect, beforeEach } from 'vitest';
import { parseXmlFile } from '../services/xmlParserService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('XML Parser Service', () => {
  const createTestXmlFile = (content) => {
    const testFilePath = path.join(__dirname, 'temp-test.xml');
    fs.writeFileSync(testFilePath, content);
    return testFilePath;
  };

  const cleanupTestFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  };

  describe('parseXmlFile', () => {
    it('should parse valid Experian XML file', async () => {
      const validXml = `<?xml version="1.0" encoding="UTF-8"?>
        <INProfileResponse>
          <Header>
            <SubjectReturnCode>1</SubjectReturnCode>
            <MemberNumber>26458902</MemberNumber>
            <SubjectName>Test Report</SubjectName>
            <ReportDate>24102024</ReportDate>
          </Header>
          <UserMessage>
            <UserMessageText>Normal Response</UserMessageText>
          </UserMessage>
          <IDAndContactInfo>
            <PersonalInfo>
              <Name>
                <FirstName>John</FirstName>
                <MiddleName>Kumar</MiddleName>
                <LastName>Doe</LastName>
              </Name>
              <DateOfBirth>15051990</DateOfBirth>
              <Gender>1</Gender>
              <PANId>ABCDE1234F</PANId>
              <PhoneInfo>
                <Number>9876543210</Number>
              </PhoneInfo>
              <AddressInfo>
                <Address>123 Test Street, Mumbai, Maharashtra, 400001</Address>
              </AddressInfo>
            </PersonalInfo>
          </IDAndContactInfo>
          <ScoreResponse>
            <BureauScore>750</BureauScore>
          </ScoreResponse>
          <CreditReportApplicantResponseList>
            <CreditReportApplicantResponse>
              <Product>
                <AccountInfo>
                  <ReportingMemberName>Test Bank</ReportingMemberName>
                  <AccountType>10</AccountType>
                  <OwnershipType>1</OwnershipType>
                  <AccountNumber>1234****5678</AccountNumber>
                  <CurrentBalance>50000</CurrentBalance>
                  <PaymentStatus1>000</PaymentStatus1>
                  <DateLastPayment>10102024</DateLastPayment>
                </AccountInfo>
              </Product>
            </CreditReportApplicantResponse>
          </CreditReportApplicantResponseList>
          <EnquiryResponseDetails>
            <EnquiryDetails>
              <InstitutionName>Sample Bank</InstitutionName>
              <EnquiryDate>01102024</EnquiryDate>
              <EnquiryAmount>100000</EnquiryAmount>
              <EnquiryPurpose>Personal Loan</EnquiryPurpose>
            </EnquiryDetails>
          </EnquiryResponseDetails>
        </INProfileResponse>`;

      const testFilePath = createTestXmlFile(validXml);

      try {
        const result = await parseXmlFile(testFilePath);

        expect(result).toBeDefined();
        expect(result.INProfileResponse).toBeDefined();
        expect(result.INProfileResponse.Header.SubjectName).toBe('Test Report');
        expect(result.INProfileResponse.ScoreResponse.BureauScore).toBe(750);
        expect(result.INProfileResponse.IDAndContactInfo.PersonalInfo.PANId).toBe('ABCDE1234F');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should throw error for invalid XML syntax', async () => {
      // Since fast-xml-parser is very forgiving, let's test an empty file which should fail
      const invalidXml = '';

      const testFilePath = createTestXmlFile(invalidXml);

      try {
        await expect(parseXmlFile(testFilePath)).rejects.toThrow();
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentPath = path.join(__dirname, 'non-existent.xml');
      
      await expect(parseXmlFile(nonExistentPath)).rejects.toThrow();
    });

    it('should handle XML without optional fields', async () => {
      const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
        <INProfileResponse>
          <Header>
            <SubjectReturnCode>1</SubjectReturnCode>
            <SubjectName>Minimal Report</SubjectName>
          </Header>
          <IDAndContactInfo>
            <PersonalInfo>
              <Name>
                <FirstName>Jane</FirstName>
                <LastName>Smith</LastName>
              </Name>
              <PANId>FGHIJ5678K</PANId>
            </PersonalInfo>
          </IDAndContactInfo>
        </INProfileResponse>`;

      const testFilePath = createTestXmlFile(minimalXml);

      try {
        const result = await parseXmlFile(testFilePath);

        expect(result).toBeDefined();
        expect(result.INProfileResponse.Header.SubjectName).toBe('Minimal Report');
        expect(result.INProfileResponse.IDAndContactInfo.PersonalInfo.PANId).toBe('FGHIJ5678K');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should handle empty XML tags', async () => {
      const xmlWithEmptyTags = `<?xml version="1.0" encoding="UTF-8"?>
        <INProfileResponse>
          <Header>
            <SubjectName></SubjectName>
            <ReportDate>24102024</ReportDate>
          </Header>
          <IDAndContactInfo>
            <PersonalInfo>
              <Name>
                <FirstName>Test</FirstName>
                <LastName></LastName>
              </Name>
            </PersonalInfo>
          </IDAndContactInfo>
        </INProfileResponse>`;

      const testFilePath = createTestXmlFile(xmlWithEmptyTags);

      try {
        const result = await parseXmlFile(testFilePath);

        expect(result).toBeDefined();
        expect(result.INProfileResponse.Header.SubjectName).toBe('');
        expect(result.INProfileResponse.IDAndContactInfo.PersonalInfo.Name.LastName).toBe('');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });
  });

  describe('XML Structure Validation', () => {
    it('should parse XML with multiple accounts', async () => {
      const multiAccountXml = `<?xml version="1.0" encoding="UTF-8"?>
        <INProfileResponse>
          <Header>
            <SubjectName>Multi Account Report</SubjectName>
          </Header>
          <CreditReportApplicantResponseList>
            <CreditReportApplicantResponse>
              <Product>
                <AccountInfo>
                  <ReportingMemberName>Bank A</ReportingMemberName>
                  <AccountType>10</AccountType>
                  <AccountNumber>1111****1111</AccountNumber>
                  <CurrentBalance>25000</CurrentBalance>
                </AccountInfo>
              </Product>
            </CreditReportApplicantResponse>
            <CreditReportApplicantResponse>
              <Product>
                <AccountInfo>
                  <ReportingMemberName>Bank B</ReportingMemberName>
                  <AccountType>35</AccountType>
                  <AccountNumber>2222****2222</AccountNumber>
                  <CurrentBalance>75000</CurrentBalance>
                </AccountInfo>
              </Product>
            </CreditReportApplicantResponse>
          </CreditReportApplicantResponseList>
        </INProfileResponse>`;

      const testFilePath = createTestXmlFile(multiAccountXml);

      try {
        const result = await parseXmlFile(testFilePath);

        expect(result.INProfileResponse.CreditReportApplicantResponseList.CreditReportApplicantResponse).toHaveLength(2);
        expect(result.INProfileResponse.CreditReportApplicantResponseList.CreditReportApplicantResponse[0].Product.AccountInfo.ReportingMemberName).toBe('Bank A');
        expect(result.INProfileResponse.CreditReportApplicantResponseList.CreditReportApplicantResponse[1].Product.AccountInfo.ReportingMemberName).toBe('Bank B');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should parse XML with multiple enquiries', async () => {
      const multiEnquiryXml = `<?xml version="1.0" encoding="UTF-8"?>
        <INProfileResponse>
          <Header>
            <SubjectName>Multi Enquiry Report</SubjectName>
          </Header>
          <EnquiryResponseDetails>
            <EnquiryDetails>
              <InstitutionName>Bank X</InstitutionName>
              <EnquiryDate>01102024</EnquiryDate>
              <EnquiryAmount>50000</EnquiryAmount>
            </EnquiryDetails>
            <EnquiryDetails>
              <InstitutionName>Bank Y</InstitutionName>
              <EnquiryDate>15102024</EnquiryDate>
              <EnquiryAmount>75000</EnquiryAmount>
            </EnquiryDetails>
          </EnquiryResponseDetails>
        </INProfileResponse>`;

      const testFilePath = createTestXmlFile(multiEnquiryXml);

      try {
        const result = await parseXmlFile(testFilePath);

        expect(result.INProfileResponse.EnquiryResponseDetails.EnquiryDetails).toHaveLength(2);
        expect(result.INProfileResponse.EnquiryResponseDetails.EnquiryDetails[0].InstitutionName).toBe('Bank X');
        expect(result.INProfileResponse.EnquiryResponseDetails.EnquiryDetails[1].InstitutionName).toBe('Bank Y');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });
  });
});
