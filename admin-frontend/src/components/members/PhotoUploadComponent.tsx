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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fallbackImage, setFallbackImage] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  
  // Initialize with the provided photo URL
  useEffect(() => {
    if (initialPhotoUrl) {
      setPhotoUrl(initialPhotoUrl);
    }
  }, [initialPhotoUrl]);
  
  // Setup drag and drop event listeners
  useEffect(() => {
    const dropArea = dropAreaRef.current;
    if (!dropArea) return;
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };
    
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
      }
    };
    
    // Add event listeners
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragenter', handleDragEnter);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    
    // Clean up
    return () => {
      dropArea.removeEventListener('dragover', handleDragOver);
      dropArea.removeEventListener('dragenter', handleDragEnter);
      dropArea.removeEventListener('dragleave', handleDragLeave);
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, []);
  
  // Handle image loading errors with fallback
  const handleImageError = () => {
    console.error('Failed to load profile image, using fallback');
    setFallbackImage(true);
  };

  // Process file (common function for both drag-drop and file input)
  const processFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 2 * 1024 * 1024; // 2MB - production requirement

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, or GIF image.');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError('File is too large. Maximum file size is 2MB.');
      return;
    }

    // Clear previous errors
    setError(null);
    setFallbackImage(false);
    
    // Create temporary URL for the image to be cropped
    const tempUrl = URL.createObjectURL(file);
    setTempImageUrl(tempUrl);
    setShowCropDialog(true);
  };
  
  // Handle file selection from input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      processFile(event.target.files[0]);
    }
  };

  // Handle crop changes
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const { width, height } = e.currentTarget;
    const cropWidthInPercent = (width * 0.9) / width * 100;
    const cropHeightInPercent = (height * 0.9) / height * 100;
    
    const percentageCrop: Crop = {
      unit: '%' as '%', // Type assertion to ensure unit is correctly typed
      width: cropWidthInPercent,
      height: cropHeightInPercent,
      x: (100 - cropWidthInPercent) / 2,
      y: (100 - cropHeightInPercent) / 2,
    };
    
    setCrop(percentageCrop);
  };
  
  // Handle crop completion
  const handleCropComplete = (crop: Crop) => {
    // Store the crop data for later use when completing the crop operation
    setCrop(crop);
    
    // Log crop dimensions for debugging
    console.log('Crop dimensions:', {
      width: crop.width,
      height: crop.height,
      x: crop.x,
      y: crop.y,
      unit: crop.unit
    });
  };

  // Apply crop to image and resize to 400x400px (production requirement)
  const applyCrop = async () => {
    if (!imageRef.current || !crop.width || !crop.height || !tempImageUrl) {
      return;
    }

    const image = imageRef.current;
    
    // Create first canvas for cropping
    const cropCanvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const pixelRatio = window.devicePixelRatio;
    const cropCtx = cropCanvas.getContext('2d');

    // Set crop canvas size based on the crop dimensions
    cropCanvas.width = crop.width * scaleX;
    cropCanvas.height = crop.height * scaleY;

    if (!cropCtx) return;
    
    // Create second canvas for resizing to exactly 400x400px
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 400; // Exactly 400px width
    finalCanvas.height = 400; // Exactly 400px height
    const finalCtx = finalCanvas.getContext('2d');
    
    if (!finalCtx) return;

    // Set crop canvas quality
    cropCtx.imageSmoothingQuality = 'high';
    cropCtx.scale(pixelRatio, pixelRatio);

    // Draw the cropped image to the crop canvas
    cropCtx.drawImage(
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
    
    // Set final canvas quality
    finalCtx.imageSmoothingQuality = 'high';
    
    // Draw the cropped image to the final canvas, resizing to exactly 400x400px
    finalCtx.drawImage(
      cropCanvas,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height,
      0,
      0,
      400,
      400
    );

    // Convert final canvas to blob and create a file - use JPEG for cross-browser compatibility
    finalCanvas.toBlob(
      (blob) => {
        if (blob) {
          // Clean up the temporary URL
          URL.revokeObjectURL(tempImageUrl);
          
          // Create a URL for the cropped image
          const croppedImageUrl = URL.createObjectURL(blob);
          setPhotoUrl(croppedImageUrl);
          
          // Create a file from the blob with standardized name for consistency
          const timestamp = new Date().getTime();
          const croppedFile = new File([blob], `profile_photo_${timestamp}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          // Log file details for debugging
          console.log('Processed image file:', {
            name: croppedFile.name,
            size: `${(croppedFile.size / 1024).toFixed(2)} KB`,
            type: croppedFile.type,
            dimensions: '400x400px'
          });
          
          // Pass the file to parent component
          onPhotoSelect(croppedFile);
          
          setShowCropDialog(false);
        }
      },
      'image/jpeg', // Always use JPEG for best cross-browser compatibility
      0.92 // Higher quality for better image output
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
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {/* Photo Preview Area with Drag & Drop */}
        <Paper 
          elevation={2} 
          ref={dropAreaRef}
          sx={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            border: isDragging ? '3px dashed #1976d2' : 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: 3,
            },
          }}
          onClick={handleUploadClick}
        >
          {photoUrl && !fallbackImage ? (
            <>
              <Avatar
                src={photoUrl}
                alt="Member Photo"
                onError={handleImageError}
                sx={{ width: '100%', height: '100%' }}
              />
              <IconButton
                sx={{
                  position: 'absolute',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadClick();
                }}
              >
                <EditIcon sx={{ color: 'white' }} />
              </IconButton>
            </>
          ) : (
            <>
              <Avatar
                sx={{ width: '100%', height: '100%', bgcolor: 'primary.main' }}
              >
                <CameraIcon sx={{ fontSize: 60, color: 'white' }} />
              </Avatar>
              {isDragging && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(25, 118, 210, 0.7)',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                >
                  <Typography variant="subtitle1">Drop Photo Here</Typography>
                </Box>
              )}
            </>
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
        
        {/* Help text for drag & drop */}
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ mt: 0.5, textAlign: 'center', display: 'block' }}
        >
          Drag & drop or click to upload. Max 2MB, 400x400px.
        </Typography>
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
                onComplete={handleCropComplete}
                aspect={1} // 1:1 aspect ratio for avatar
                circularCrop
                ruleOfThirds={true} // Helpful grid for better composition
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
