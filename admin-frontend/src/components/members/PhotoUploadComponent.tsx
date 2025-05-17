import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Slider,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Crop,
  Save,
  Trash,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ReactCrop, { Crop as CropType, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { adminApi } from '../../services/api';

interface PhotoUploadComponentProps {
  memberId: string;
  currentPhotoUrl?: string;
  onSuccess?: (photoUrl: string) => void;
  onError?: (error: Error) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

export const PhotoUploadComponent: React.FC<PhotoUploadComponentProps> = ({
  memberId,
  currentPhotoUrl,
  onSuccess,
  onError,
}) => {
  // States for handling file and preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // States for image cropping
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  // Refs
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  // Default crop settings
  const defaultCrop: CropType = {
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10,
  };

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: (formData: FormData) => adminApi.uploadMemberPhoto(memberId, formData),
    onSuccess: (data: { imageUrl: string }) => {
      setIsUploading(false);
      setSuccess(true);
      setPreviewUrl(data.imageUrl);
      setSelectedFile(null);
      onSuccess?.(data.imageUrl);
      
      // Invalidate member data to refresh UI
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (error: Error) => {
      setIsUploading(false);
      setError(`Upload failed: ${error.message}`);
      onError?.(error);
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: () => adminApi.deleteMemberPhoto(memberId),
    onSuccess: () => {
      setPreviewUrl(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Invalidate member data to refresh UI
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
    },
    onError: (error: Error) => {
      setError(`Delete failed: ${error.message}`);
      onError?.(error);
    },
  });

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    if (!file) {
      return;
    }

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError(`Invalid file type. Accepted types: ${ACCEPTED_FILE_TYPES.map(t => t.split('/')[1]).join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }

    // Reset previous error
    setError(null);
    setSelectedFile(file);

    // Create a preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Open crop dialog
    setCropDialogOpen(true);
    setCrop(defaultCrop);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Reset all states
  const handleReset = () => {
    setSelectedFile(null);
    
    if (previewUrl && !currentPhotoUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setPreviewUrl(currentPhotoUrl || null);
    setError(null);
    setSuccess(false);
    setCrop(defaultCrop);
    setZoom(1);
    setRotation(0);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile || !completedCrop) {
      setError('Please select an image and crop it');
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      // Generate cropped image
      const croppedBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        rotation,
        selectedFile.type || 'image/jpeg',
        zoom
      );
      
      if (!croppedBlob) {
        throw new Error('Failed to crop image');
      }
      
      // Create a new File object with the cropped image
      const croppedFile = new File([croppedBlob], selectedFile.name, {
        type: selectedFile.type,
        lastModified: Date.now(),
      });

      // Create FormData and append cropped file
      const formData = new FormData();
      formData.append('photo', croppedFile);
      
      uploadPhotoMutation.mutate(formData);
    } catch (error) {
      setIsUploading(false);
      setError(`Failed to process image: ${(error as Error).message}`);
    }
  };

  // Handle photo deletion
  const handleDeletePhoto = () => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      deletePhotoMutation.mutate();
    }
  };

  // Function to generate cropped image
  const getCroppedImg = (
    image: HTMLImageElement | null,
    crop: PixelCrop,
    rotation: number = 0,
    fileType: string = 'image/jpeg',
    scale: number = 1
  ): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!image) {
        resolve(null);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      // Calculate dimensions taking rotation into account
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Set canvas size to the crop dimensions
      const pixelRatio = window.devicePixelRatio;
      canvas.width = crop.width * scaleX * scale * pixelRatio;
      canvas.height = crop.height * scaleY * scale * pixelRatio;

      // Set context scaling and rotation
      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';

      // Calculate the center for rotation
      const centerX = canvas.width / 2 / pixelRatio;
      const centerY = canvas.height / 2 / pixelRatio;

      // Translate and rotate around center if needed
      if (rotation !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      // Draw image with crop and scaling
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX * scale,
        crop.height * scaleY * scale
      );

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        fileType,
        0.95 // High quality
      );
    });
  };

  // Handler for crop completion
  const onCropComplete = useCallback((crop: PixelCrop) => {
    setCompletedCrop(crop);
  }, []);

  // Handle zoom change
  const handleZoomChange = (_event: Event, newValue: number | number[]) => {
    setZoom(newValue as number);
  };

  // Handle rotation change
  const handleRotateClick = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Handle crop dialog close
  const handleCropDialogClose = () => {
    setCropDialogOpen(false);
  };

  // Handle crop confirmation
  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    setIsCropping(true);

    try {
      const croppedBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        rotation,
        selectedFile?.type || 'image/jpeg',
        zoom
      );

      if (croppedBlob) {
        // Update preview with cropped image
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        
        const croppedUrl = URL.createObjectURL(croppedBlob);
        setPreviewUrl(croppedUrl);
      }

      setCropDialogOpen(false);
    } catch (error) {
      setError(`Failed to crop image: ${(error as Error).message}`);
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Main photo upload area */}
      <Paper
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Member Photo
        </Typography>

        {/* Error alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2, width: '100%' }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Success alert */}
        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 2, width: '100%' }}
            onClose={() => setSuccess(false)}
          >
            Photo {previewUrl ? 'uploaded' : 'removed'} successfully!
          </Alert>
        )}

        {/* Photo preview */}
        <Box 
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            py: 2,
          }}
        >
          {previewUrl ? (
            <Box sx={{ position: 'relative', mb: 2 }}>
              <Avatar
                src={previewUrl}
                alt="Member Photo"
                sx={{ width: 150, height: 150, boxShadow: 2 }}
              />
              
              {/* Delete photo button */}
              <Tooltip title="Delete photo">
                <IconButton
                  size="small"
                  color="error"
                  onClick={handleDeletePhoto}
                  disabled={deletePhotoMutation.isPending}
                  sx={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                  }}
                >
                  <Trash size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Box
              sx={{
                width: 150,
                height: 150,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #ccc',
                borderRadius: '50%',
                mb: 2,
              }}
            >
              <ImageIcon size={40} color="#9e9e9e" />
              <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1 }}>
                No photo
              </Typography>
            </Box>
          )}

          {/* Upload button */}
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES.join(',')}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={triggerFileInput}
              sx={{ mt: 1 }}
            >
              {previewUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>

            {selectedFile && previewUrl && (
              <Button
                variant="contained"
                color="success"
                startIcon={<Save />}
                onClick={handleUpload}
                disabled={isUploading}
                sx={{ mt: 1 }}
              >
                {isUploading ? 'Uploading...' : 'Save Photo'}
              </Button>
            )}
          </Box>

          {/* Guidelines */}
          <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
            Recommended: Square image, max {MAX_FILE_SIZE / (1024 * 1024)}MB. <br />
            Accepted formats: JPEG, PNG, WebP
          </Typography>
        </Box>

        {/* Loading overlay */}
        {(isUploading || deletePhotoMutation.isPending) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </Paper>

      {/* Crop dialog */}
      <Dialog
        open={cropDialogOpen}
        onClose={handleCropDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            overflow: 'visible',
          },
        }}
      >
        <DialogTitle>Crop and Adjust Photo</DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 3,
                  position: 'relative',
                  height: 400,
                  maxHeight: '70vh',
                }}
              >
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={onCropComplete}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={previewUrl}
                    alt="Crop Preview"
                    style={{
                      maxHeight: '100%',
                      maxWidth: '100%',
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: 'center',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </ReactCrop>
              </Box>

              <Box sx={{ mt: 2, pb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography id="zoom-slider-label">Zoom:</Typography>
                  <ZoomOut size={16} />
                  <Slider
                    value={zoom}
                    onChange={handleZoomChange}
                    min={0.5}
                    max={3}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                    aria-labelledby="zoom-slider-label"
                    sx={{ flex: 1 }}
                  />
                  <ZoomIn size={16} />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<RotateCw />}
                    onClick={handleRotateClick}
                  >
                    Rotate 90u00b0
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCropDialogClose} disabled={isCropping}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={isCropping ? <CircularProgress size={16} /> : <Crop />}
            onClick={handleCropConfirm}
            disabled={isCropping || !completedCrop}
          >
            {isCropping ? 'Processing...' : 'Apply Crop'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
