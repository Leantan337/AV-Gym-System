import React from 'react';
import { Grid } from '@mui/material';
import { GridProps } from '../../types/mui.types';

// This is a wrapper component for Grid that handles the component prop automatically
export const GridItem: React.FC<GridProps> = (props) => {
  return <Grid {...props} />;
};

export default GridItem;
