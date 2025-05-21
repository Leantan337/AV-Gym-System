import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  Paper,
  Slider,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Crop as CropIcon,
} from '@mui/icons-material';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface PhotoUploadComponentProps {
  initialPhotoUrl?: string;
  onPhotoSelect: (file: File | null) => void;
}

export default function PhotoUploadComponent({
  initialPhotoUrl,
  onPhotoSelect,
}: PhotoUploadComponentProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [zoom, setZoom] = useState<number>(1);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Initialize with the provided photo URL
  useEffect(() => {
    if (initialPhotoUrl) {
      setPhotoUrl(initialPhotoUrl);
    }
  }, [initialPhotoUrl]);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please upload a JPEG, PNG, or GIF image.');
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        setError('File is too large. Maximum file size is 5MB.');
        return;
      }

      // Clear previous errors
      setError(null);
      
      // Create temporary URL for the image to be cropped
      const tempUrl = URL.createObjectURL(file);
      setTempImageUrl(tempUrl);
      setShowCropDialog(true);
    }
  };

  // Handle crop operation complete
  const handleCropComplete = (crop: Crop, percentageCrop: Crop) => {
    setCrop(percentageCrop);
  };

  // Apply crop to image
  const applyCrop = async () => {
    if (!imageRef.current || !crop.width || !crop.height || !tempImageUrl) {
      return;
    }

    const image = imageRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const pixelRatio = window.devicePixelRatio;
    const ctx = canvas.getContext('2d');

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    if (!ctx) return;

    // Set canvas quality
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(pixelRatio, pixelRatio);

    // Draw the cropped image
    ctx.drawImage(
      image,
      (crop.x || 0) * scaleX,
      (crop.y || 0) * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    // Convert canvas to blob and create a file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Clean up the temporary URL
          URL.revokeObjectURL(tempImageUrl);
          
          // Create a URL for the cropped image
          const croppedImageUrl = URL.createObjectURL(blob);
          setPhotoUrl(croppedImageUrl);
          
          // Create a file from the blob
          const croppedFile = new File([blob], 'profile_photo.jpg', {
            type: 'image/jpeg',
          });
          
          // Pass the file to parent component
          onPhotoSelect(croppedFile);
          
          // Close the dialog
          setShowCropDialog(false);
        }
      },
      'image/jpeg',
      0.95 // Quality
    );
  };

  // Handle remove photo
  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    onPhotoSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle zoom change
  const handleZoomChange = (event: Event, newValue: number | number[]) => {
    setZoom(newValue as number);
  };

  // Trigger file input click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box>
      {/* Photo Display Area */}
      <Box 
        display="flex" 
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <Paper 
          elevation={2} 
          sx={{
            width: 200,
            height: 200,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 1,
            mb: 2,
            borderRadius: '50%',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {photoUrl ? (
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
              <Avatar
                src={photoUrl}
                alt="Member Photo"
                sx={{ width: '100%', height: '100%' }}
              />
              <IconButton
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 5,
                  right: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.95)' },
                }}
                onClick={handleUploadClick}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box 
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              sx={{ color: 'text.secondary' }}
            >
              <CameraIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="body2">No photo</Typography>
            </Box>
          )}
          {isUploading && (
            <Box 
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <CircularProgress size={40} />
            </Box>
          )}
        </Paper>
        
        {/* Upload/Remove Buttons */}
        <Box display="flex" justifyContent="center" gap={1}>
          <Button
            variant="outlined"
            startIcon={<CameraIcon />}
            onClick={handleUploadClick}
            size="small"
          >
            Upload Photo
          </Button>
          {photoUrl && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleRemovePhoto}
              size="small"
            >
              Remove
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </Box>
        
        {/* Error Message */}
        {error && (
          <Typography 
            color="error" 
            variant="caption" 
            sx={{ mt: 1, textAlign: 'center', display: 'block' }}
          >
            {error}
          </Typography>
        )}
      </Box>

      {/* Crop Dialog */}
      <Dialog 
        open={showCropDialog} 
        onClose={() => {
          setShowCropDialog(false);
          if (tempImageUrl) {
            URL.revokeObjectURL(tempImageUrl);
            setTempImageUrl(null);
          }
        }}
        maxWidth="md"
      >
        <DialogContent>
          <Typography variant="h6" gutterBottom>Crop Photo</Typography>
          <Box sx={{ overflow: 'hidden', maxWidth: '100%', maxHeight: '70vh' }}>
            {tempImageUrl && (
              /* @ts-ignore - Ignoring type errors for ReactCrop as the type definitions don't match library behavior */
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(crop: Crop) => {
                  // Store the crop data for later use when completing the crop operation
                  setCrop(crop);
                }}
                aspect={1} // 1:1 aspect ratio for avatar
                circularCrop
              >
                <img
                  ref={(img) => { imageRef.current = img; }}
                  src={tempImageUrl}
                  alt="Upload Preview"
                  style={{ 
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center',
                    maxWidth: '100%',
                    transition: 'transform 0.3s'
                  }}
                />
              </ReactCrop>
            )}
          </Box>
          
          {/* Zoom Control */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
            <ZoomOutIcon sx={{ mr: 1 }} />
            <Slider
              value={zoom}
              min={0.5}
              max={3}
              step={0.1}
              onChange={handleZoomChange}
              aria-labelledby="zoom-slider"
              sx={{ mx: 2 }}
            />
            <ZoomInIcon sx={{ ml: 1 }} />
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Drag to reposition. Use slider to zoom in or out.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowCropDialog(false);
              if (tempImageUrl) {
                URL.revokeObjectURL(tempImageUrl);
                setTempImageUrl(null);
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<CropIcon />}
            onClick={applyCrop}
          >
            Apply Crop
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
