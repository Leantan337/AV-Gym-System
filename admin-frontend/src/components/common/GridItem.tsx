import { Grid } from '@mui/material';
import type { GridProps } from '@mui/material';
import React from 'react';

type GridItemProps = Omit<GridProps, 'item'> & {
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
};

// This is a wrapper component for Grid that handles the component prop automatically
export const GridItem: React.FC<GridItemProps> = ({ children, ...props }) => {
  return (
    <Grid item {...props}>
      {children}
    </Grid>
  );
};

export default GridItem;
