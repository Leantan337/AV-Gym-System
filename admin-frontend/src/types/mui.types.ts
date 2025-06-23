import { ElementType, ReactNode } from 'react';
import { Theme } from '@mui/material/styles';
import { SxProps } from '@mui/system';

// Defining explicit props for Grid to avoid TypeScript errors
export interface GridProps {
  children?: ReactNode;
  container?: boolean;
  item?: boolean;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  spacing?: number;
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  sx?: SxProps<Theme>;
}

// Extended Grid props for our custom Grid component
export type ExtendedGridProps = GridProps & {
  component?: ElementType;
};

export interface ButtonProps {
  disabled?: boolean;
  loading?: boolean;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  onClick?: () => void;
  startIcon?: React.ReactNode;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
}

// Using ExtendedGridProps instead
