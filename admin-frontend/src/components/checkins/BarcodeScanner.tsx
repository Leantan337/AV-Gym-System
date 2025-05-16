import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, TextField, Typography, Paper, CircularProgress, Alert, Fade } from '@mui/material';
import { Barcode, CheckCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (memberId: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  const [scannedCode, setScannedCode] = useState<string>('');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const SCAN_DELAY = 1000; // Prevent duplicate scans within 1 second

  // Focus the hidden input field when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const processBarcode = useCallback((code: string) => {
    // Simple validation - most gym barcodes will be numeric and have a reasonable length
    if (!/^[0-9A-Za-z-_]{4,20}$/.test(code)) {
      setScanStatus('error');
      setErrorMessage('Invalid barcode format');
      setTimeout(() => setScanStatus('idle'), 3000);
      return false;
    }
    return true;
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const currentTime = Date.now();
    
    // If the key is Enter and we have a code
    if (event.key === 'Enter' && scannedCode) {
      // Check if enough time has passed since last scan
      if (currentTime - lastScanTime > SCAN_DELAY) {
        if (processBarcode(scannedCode)) {
          setScanStatus('scanning');
          // Process the scan
          try {
            onScan(scannedCode);
            setScanStatus('success');
            setTimeout(() => setScanStatus('idle'), 3000);
          } catch (error) {
            setScanStatus('error');
            setErrorMessage('Failed to process scan');
            setTimeout(() => setScanStatus('idle'), 3000);
          }
        }
        setScannedCode('');
        setLastScanTime(currentTime);
      }
      event.preventDefault();
    } else if (event.key === 'Escape') {
      // Clear on escape
      setScannedCode('');
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

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScannedCode(e.target.value);
  };

  const handleManualSubmit = () => {
    if (scannedCode && processBarcode(scannedCode)) {
      setScanStatus('scanning');
      try {
        onScan(scannedCode);
        setScanStatus('success');
        setTimeout(() => setScanStatus('idle'), 3000);
        setScannedCode('');
      } catch (error) {
        setScanStatus('error');
        setErrorMessage('Failed to process scan');
        setTimeout(() => setScanStatus('idle'), 3000);
      }
    }
  };

  const handleClick = () => {
    // When clicking on the component, focus the hidden input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <Paper 
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        backgroundColor: scanStatus === 'success' ? 'rgba(46, 125, 50, 0.04)' : 
                        scanStatus === 'error' ? 'rgba(211, 47, 47, 0.04)' : 'background.default',
        border: scanStatus === 'success' ? '1px solid rgba(46, 125, 50, 0.2)' : 
               scanStatus === 'error' ? '1px solid rgba(211, 47, 47, 0.2)' : 'none',
        transition: 'all 0.3s ease',
        position: 'relative',
        cursor: 'text',
        minHeight: '220px',
      }}
      onClick={handleClick}
    >
      {/* Status indicators */}
      {scanStatus === 'success' && (
        <Fade in={true}>
          <Box sx={{ position: 'absolute', top: '10px', right: '10px' }}>
            <CheckCircle color="#2e7d32" size={24} />
          </Box>
        </Fade>
      )}
      
      {scanStatus === 'scanning' && (
        <Box sx={{ position: 'absolute', top: '10px', right: '10px' }}>
          <CircularProgress size={24} color="primary" />
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Barcode size={24} color={scanStatus === 'error' ? '#d32f2f' : undefined} />
        <Typography variant="h6" color={scanStatus === 'error' ? 'error' : 'inherit'}>
          Barcode Scanner {scanStatus === 'success' ? '- Successful Scan!' : scanStatus === 'error' ? '- Error' : 'Ready'}
        </Typography>
      </Box>
      
      {scanStatus === 'error' && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      )}

      {scanStatus === 'success' && (
        <Alert severity="success" sx={{ width: '100%' }}>
          Member checked in successfully!
        </Alert>
      )}
      
      <Typography variant="body2" color="text.secondary" align="center">
        Scan a member's card using the barcode scanner or enter the code manually
      </Typography>

      <Box sx={{ width: '100%', display: 'flex', gap: 1 }}>
        <TextField
          value={scannedCode}
          onChange={handleManualInput}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          placeholder="Scanned or manual code"
          fullWidth
          size="small"
          disabled={scanStatus === 'scanning'}
          error={scanStatus === 'error'}
          InputProps={{
            endAdornment: scanStatus === 'scanning' ? <CircularProgress size={20} /> : null,
          }}
        />
      </Box>

      {/* Hidden input field that's always focused to capture barcode scanner input */}
      <input 
        ref={inputRef}
        type="text"
        value=""
        style={{ 
          position: 'absolute', 
          opacity: 0,
          pointerEvents: 'none'
        }}
      />

      <Typography variant="caption" color="text.secondary">
        The scanner is active and will automatically process barcodes when detected
      </Typography>
    </Paper>
  );
};
