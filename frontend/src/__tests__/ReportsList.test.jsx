import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ReportsList from '../components/ReportsList';

// Mock the credit reports API
vi.mock('../api/creditReports', () => ({
  getReports: vi.fn(),
  deleteReport: vi.fn()
}));

import { getReports, deleteReport } from '../api/creditReports';

// Mock react-router-dom for navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockReportsData = {
  success: true,
  data: {
    reports: [
      {
        id: '1',
        name: 'John Doe',
        creditScore: 750,
        totalAccounts: 3,
        activeAccounts: 2,
        currentBalance: 125000,
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        name: 'Jane Smith',
        creditScore: 680,
        totalAccounts: 2,
        activeAccounts: 1,
        currentBalance: 75000,
        createdAt: '2024-01-14T09:20:00Z'
      }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalReports: 2,
      limit: 10
    }
  }
};

describe('ReportsList Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render reports list with data', async () => {
    getReports.mockResolvedValueOnce(mockReportsData);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    // Should show loading initially
    expect(screen.getByText('Loading reports...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Credit Reports')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Check report details
    expect(screen.getByText('750')).toBeInTheDocument();
    expect(screen.getByText('680')).toBeInTheDocument();
    expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
    expect(screen.getByText('₹75,000')).toBeInTheDocument();
  });

  it('should handle empty reports list', async () => {
    const emptyData = {
      success: true,
      data: {
        reports: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalReports: 0,
          limit: 10
        }
      }
    };

    getReports.mockResolvedValueOnce(emptyData);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No reports found')).toBeInTheDocument();
      expect(screen.getByText('Upload your first credit report to get started.')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    const errorMessage = 'Failed to fetch reports';
    getReports.mockRejectedValueOnce(new Error(errorMessage));

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error loading reports')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should navigate to report detail when view button is clicked', async () => {
    getReports.mockResolvedValueOnce(mockReportsData);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByTitle('View Report');
    expect(viewButtons[0]).toHaveAttribute('href', '/reports/1');
  });

  it('should delete report when delete button is clicked', async () => {
    getReports.mockResolvedValueOnce(mockReportsData);
    deleteReport.mockResolvedValueOnce({ success: true });

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete Report');
    await user.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this report?');
    
    await waitFor(() => {
      expect(deleteReport).toHaveBeenCalledWith('1');
    });

    confirmSpy.mockRestore();
  });

  it('should not delete report when confirmation is cancelled', async () => {
    getReports.mockResolvedValueOnce(mockReportsData);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete Report');
    await user.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteReport).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should handle delete error', async () => {
    getReports.mockResolvedValueOnce(mockReportsData);
    deleteReport.mockRejectedValueOnce(new Error('Delete failed'));

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete Report');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to delete report: Delete failed');
    });

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('should format dates correctly', async () => {
    getReports.mockResolvedValueOnce(mockReportsData);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check that dates are formatted (exact format depends on implementation)
      const dateElements = screen.getAllByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('should format currency correctly', async () => {
    getReports.mockResolvedValueOnce(mockReportsData);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
      expect(screen.getByText('₹75,000')).toBeInTheDocument();
    });
  });

  it('should show pagination when multiple pages exist', async () => {
    const multiPageData = {
      ...mockReportsData,
      data: {
        ...mockReportsData.data,
        pagination: {
          currentPage: 1,
          totalPages: 3,
          totalReports: 25,
          limit: 10
        }
      }
    };

    getReports.mockResolvedValueOnce(multiPageData);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText((content, element) => 
        content.includes('Showing page') && element?.tagName.toLowerCase() === 'p'
      )).toBeInTheDocument();
      expect(screen.getAllByText('Next').length).toBeGreaterThan(0);
    });
  });

  it('should refresh data when component mounts', async () => {
    getReports.mockResolvedValueOnce(mockReportsData);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    expect(getReports).toHaveBeenCalledWith(1, 10);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should display account summary correctly', async () => {
    getReports.mockResolvedValueOnce(mockReportsData);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('3 accounts (2 active)')).toBeInTheDocument();
      expect(screen.getByText('2 accounts (1 active)')).toBeInTheDocument();
    });
  });

  it('should handle loading state', async () => {
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    getReports.mockReturnValueOnce(promise);

    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading reports...')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise(mockReportsData);

    await waitFor(() => {
      expect(screen.queryByText('Loading reports...')).not.toBeInTheDocument();
    });
  });
});
