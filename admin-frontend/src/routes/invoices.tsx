import { RouteObject } from 'react-router-dom';
import { InvoicePage } from '../components/invoices/InvoicePage';

export const invoiceRoutes: RouteObject[] = [
  {
    path: 'invoices',
    element: <InvoicePage />,
  },
];
