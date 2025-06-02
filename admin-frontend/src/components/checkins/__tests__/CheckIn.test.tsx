import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarcodeScanner } from '../BarcodeScanner';
import { ManualEntryForm } from '../ManualEntryForm';
import { searchMembers } from '../../../services/api';

// Mock the API
jest.mock('../../../services/api', () => ({
  searchMembers: jest.fn(),
}));

describe('BarcodeScanner', () => {
  const mockOnScan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles barcode input correctly', async () => {
    render(<BarcodeScanner onScan={mockOnScan} />);

    // Simulate barcode scanner input (typically ends with Enter)
    const testBarcode = '123456789';
    for (const char of testBarcode) {
      fireEvent.keyDown(document, { key: char });
    }
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(mockOnScan).toHaveBeenCalledWith(testBarcode);
  });

  it('prevents duplicate scans within delay period', async () => {
    render(<BarcodeScanner onScan={mockOnScan} />);

    // First scan
    const testBarcode = '123456789';
    for (const char of testBarcode) {
      fireEvent.keyDown(document, { key: char });
    }
    fireEvent.keyDown(document, { key: 'Enter' });

    // Immediate second scan
    for (const char of testBarcode) {
      fireEvent.keyDown(document, { key: char });
    }
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(mockOnScan).toHaveBeenCalledTimes(1);
  });
});

describe('ManualEntryForm', () => {
  const mockOnSubmit = jest.fn();
  const mockMembers = [
    { id: '1', fullName: 'John Doe', membershipNumber: 'M001' },
    { id: '2', fullName: 'Jane Smith', membershipNumber: 'M002' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (searchMembers as jest.Mock).mockResolvedValue(mockMembers);
  });

  it('searches members as user types', async () => {
    render(<ManualEntryForm onSubmit={mockOnSubmit} />);

    const searchInput = screen.getByPlaceholderText(/start typing/i);
    
    // Wrap the typing action in act()
    await act(async () => {
      await userEvent.type(searchInput, 'john', { delay: 100 });
    });

    // Wait for the API call
    await waitFor(() => {
      expect(searchMembers).toHaveBeenCalledWith('john');
    }, { timeout: 3000 });

    // Wait for and select a member from dropdown
    const memberOption = await screen.findByText(/John Doe/);
    await act(async () => {
      await userEvent.click(memberOption);
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /check in/i });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith('1');
  });

  it('handles search errors gracefully', async () => {
    (searchMembers as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<ManualEntryForm onSubmit={mockOnSubmit} />);

    const searchInput = screen.getByPlaceholderText(/start typing/i);
    
    // Wrap the typing action in act()
    await act(async () => {
      await userEvent.type(searchInput, 'error', { delay: 100 });
    });

    // Wait for all state updates to complete
    await waitFor(() => {
      expect(screen.getByText(/no members found/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
