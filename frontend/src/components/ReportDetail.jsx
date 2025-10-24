import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  DocumentIcon, 
  UserIcon, 
  PhoneIcon, 
  CreditCardIcon,
  BanknotesIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { getReport } from '../api/creditReports';
import { 
  formatCurrency, 
  formatDate, 
  formatCreditScore, 
  getAccountStatusBadge,
  calculateAccountHealth,
  downloadFile,
  copyToClipboard
} from '../utils/helpers';

const ReportDetail = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await getReport(id);
        setReport(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const handleCopyPAN = async () => {
    if (report?.basicDetails?.pan) {
      const success = await copyToClipboard(report.basicDetails.pan);
      if (success) {
        alert('PAN copied to clipboard');
      }
    }
  };

  const handleDownloadXML = () => {
    if (report?.rawXmlUrl) {
      downloadFile(report.rawXmlUrl, `credit-report-${id}.xml`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="spinner"></div>
        <span className="ml-2 text-gray-600">Loading report details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">Error loading report</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <Link to="/reports" className="btn-primary">
          Back to Reports
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Report not found</p>
        <Link to="/reports" className="btn-primary mt-4">
          Back to Reports
        </Link>
      </div>
    );
  }

  const { basicDetails, reportSummary, creditAccounts, enquiries } = report;
  const scoreData = formatCreditScore(basicDetails.creditScore);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/reports" 
            className="text-gray-600 hover:text-gray-800"
            title="Back to Reports"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Credit Report - {basicDetails.name || 'Unknown'}
            </h1>
            <p className="text-sm text-gray-500">
              Generated on {formatDate(report.createdAt)}
            </p>
          </div>
        </div>
        <button
          onClick={handleDownloadXML}
          className="btn-secondary flex items-center space-x-2"
        >
          <DocumentIcon className="w-4 h-4" />
          <span>Download XML</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'accounts', name: 'Credit Accounts' },
            { id: 'enquiries', name: 'Enquiries' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Details */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <div className="flex items-center space-x-3 mb-4">
                <UserIcon className="w-6 h-6 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Basic Details</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{basicDetails.name || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">PAN</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900">{basicDetails.pan || 'N/A'}</p>
                    {basicDetails.pan && (
                      <button
                        onClick={handleCopyPAN}
                        className="text-primary-600 hover:text-primary-800"
                        title="Copy PAN"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">{basicDetails.mobilePhone || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{basicDetails.email || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-gray-900">{formatDate(basicDetails.dateOfBirth)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  <p className="text-gray-900">{basicDetails.gender || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Score & Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Credit Score */}
            <div className="card p-6">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-2xl font-bold ${scoreData.bgColor} ${scoreData.color} mb-4`}>
                  {scoreData.score}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Credit Score</h2>
                <p className="text-sm text-gray-500">
                  {scoreData.score >= 750 ? 'Excellent' : scoreData.score >= 650 ? 'Good' : 'Needs Improvement'}
                </p>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <CreditCardIcon className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{reportSummary.totalAccounts}</p>
                <p className="text-sm text-gray-500">Total Accounts</p>
              </div>
              
              <div className="card p-4 text-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{reportSummary.activeAccounts}</p>
                <p className="text-sm text-gray-500">Active Accounts</p>
              </div>
              
              <div className="card p-4 text-center">
                <BanknotesIcon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-lg font-bold text-gray-900">{formatCurrency(reportSummary.currentBalanceAmount)}</p>
                <p className="text-sm text-gray-500">Total Balance</p>
              </div>
              
              <div className="card p-4 text-center">
                <DocumentIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{reportSummary.recentEnquiries}</p>
                <p className="text-sm text-gray-500">Recent Enquiries</p>
              </div>
            </div>

            {/* Debt Breakdown */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Debt Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-500">Secured Debt</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(reportSummary.securedAmount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${report.totalDebt > 0 ? (reportSummary.securedAmount / report.totalDebt) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-500">Unsecured Debt</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(reportSummary.unsecuredAmount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full"
                      style={{
                        width: `${report.totalDebt > 0 ? (reportSummary.unsecuredAmount / report.totalDebt) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Credit Accounts</h2>
            <p className="text-sm text-gray-500">{creditAccounts.length} total accounts</p>
          </div>
          
          {creditAccounts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No credit accounts found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Institution</th>
                    <th className="table-header">Account Type</th>
                    <th className="table-header">Account Number</th>
                    <th className="table-header">Current Balance</th>
                    <th className="table-header">Amount Overdue</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Health</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {creditAccounts.map((account, index) => {
                    const statusBadge = getAccountStatusBadge(account.status);
                    const health = calculateAccountHealth(account);
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="table-cell">
                          <div className="font-medium text-gray-900">
                            {account.bankName || 'Unknown Bank'}
                          </div>
                        </td>
                        <td className="table-cell text-gray-500">
                          {account.type}
                        </td>
                        <td className="table-cell text-gray-500 font-mono">
                          {account.accountNumber || 'N/A'}
                        </td>
                        <td className="table-cell font-medium">
                          {formatCurrency(account.currentBalance)}
                        </td>
                        <td className="table-cell">
                          <span className={account.amountOverdue > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {formatCurrency(account.amountOverdue)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`font-medium ${health.color}`}>
                            {health.score}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Enquiries Tab */}
      {activeTab === 'enquiries' && (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Credit Enquiries</h2>
            <p className="text-sm text-gray-500">{enquiries.length} total enquiries</p>
          </div>
          
          {enquiries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No credit enquiries found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Institution</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Purpose</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enquiries.map((enquiry, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="table-cell font-medium text-gray-900">
                        {enquiry.institution || 'Unknown'}
                      </td>
                      <td className="table-cell text-gray-500">
                        {formatDate(enquiry.date)}
                      </td>
                      <td className="table-cell">
                        {formatCurrency(enquiry.amount)}
                      </td>
                      <td className="table-cell text-gray-500">
                        {enquiry.purpose || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportDetail;
