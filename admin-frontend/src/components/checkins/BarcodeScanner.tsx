import React, { useEffect, useState, useCallback } from 'react';
import { Box, TextField, Typography, Paper } from '@mui/material';
import { Barcode } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (memberId: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  const [scannedCode, setScannedCode] = useState<string>('');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const SCAN_DELAY = 1000; // Prevent duplicate scans within 1 second

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const currentTime = Date.now();
    
    // If the key is Enter and we have a code
    if (event.key === 'Enter' && scannedCode) {
      // Check if enough time has passed since last scan
      if (currentTime - lastScanTime > SCAN_DELAY) {
        onScan(scannedCode);
        setScannedCode('');
        setLastScanTime(currentTime);
      }
      event.preventDefault();
    } else if (event.key.length === 1) { // Only add printable characters
      setScannedCode(prev => prev + event.key);
    }
  }, [scannedCode, lastScanTime, onScan]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <Paper 
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'background.default'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Barcode size={24} />
        <Typography variant="h6">
          Barcode Scanner Ready
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" align="center">
        Scan a member's card using the barcode scanner
      </Typography>

      <TextField
        value={scannedCode}
        onChange={(e) => setScannedCode(e.target.value)}
        placeholder="Scanned code will appear here"
        fullWidth
        size="small"
        InputProps={{
          readOnly: true,
        }}
      />

      <Typography variant="caption" color="text.secondary">
        The scanner is active and will automatically process barcodes
      </Typography>
    </Paper>
  );
};
