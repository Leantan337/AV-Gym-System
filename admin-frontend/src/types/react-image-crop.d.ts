// Type definitions for react-image-crop
declare module 'react-image-crop' {
  import React from 'react';

  export interface Crop {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    unit?: 'px' | '%';
    aspect?: number;
  }
  
  export interface PixelCrop extends Crop {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: 'px';
  }

  export interface ReactCropProps {
    src: string;
    crop?: Crop;
    onChange?: (crop: Crop) => void;
    onComplete?: (crop: Crop) => void;
    onImageLoaded?: (image: HTMLImageElement) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    disabled?: boolean;
    crossorigin?: string;
    className?: string;
    style?: React.CSSProperties;
    imageStyle?: React.CSSProperties;
    keepSelection?: boolean;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    ruleOfThirds?: boolean;
    circularCrop?: boolean;
    renderComponent?: React.ReactNode;
  }

  const ReactCrop: React.FC<ReactCropProps>;
  export default ReactCrop;
}
