import React, { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import Quagga, { QuaggaJSResultObject } from '@ericblade/quagga2';

interface BarcodeScannerProps {
  onScan: (memberId: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      Quagga.init({
        numOfWorkers: navigator.hardwareConcurrency || 4,
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            facingMode: "environment"
          },
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader"],
        }
      }, (err: Error | null) => {
        if (err) {
          console.error("Failed to initialize barcode scanner:", err);
          return;
        }
        Quagga.start();
      });

      Quagga.onDetected((result: QuaggaJSResultObject) => {
        const code = result.codeResult.code;
        if (code) {
          onScan(code);
        }
      });

      return () => {
        Quagga.stop();
      };
    }
  }, [onScan]);

  return (
    <Box sx={{ position: 'relative', minHeight: 300 }}>
      <div
        ref={videoRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '300px',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            p: 2,
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary" align="center">
            Position the barcode in the center of the camera
          </Typography>
        </Box>
      </div>
    </Box>
  );
};
