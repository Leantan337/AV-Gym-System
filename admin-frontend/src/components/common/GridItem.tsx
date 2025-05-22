import { Grid } from '@mui/material';
import type { GridProps } from '@mui/material';
import React from 'react';

type GridItemProps = Omit<GridProps, 'container' | 'item' | 'component'> & {
  xs?: number | boolean | 'auto';
  sm?: number | boolean | 'auto';
  md?: number | boolean | 'auto';
  lg?: number | boolean | 'auto';
  xl?: number | boolean | 'auto';
  component?: React.ElementType;
};

// This is a wrapper component for Grid that handles the component prop automatically
export const GridItem: React.FC<GridItemProps> = ({ children, component = 'div', ...props }) => {
  return (
    <Grid component={component} item {...props}>
      {children}
    </Grid>
  );
};

GridItem.displayName = 'GridItem';

export default GridItem;
