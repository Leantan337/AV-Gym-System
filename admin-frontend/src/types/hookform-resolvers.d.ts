// Type definitions for @hookform/resolvers/yup
declare module '@hookform/resolvers/yup' {
  import { Schema } from 'yup';
  import { Resolver } from 'react-hook-form';

  export function yupResolver(schema: Schema): Resolver;
}
