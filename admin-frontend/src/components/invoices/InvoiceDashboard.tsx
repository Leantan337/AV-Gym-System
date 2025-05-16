import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Stack,
  Divider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import { 
  BarChart,
  PieChart,
  LineChart,
  DollarSign,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  AlertTriangle,
  Download,
  Calendar,
  Filter,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { invoiceApi } from '../../services/invoiceApi';
import { paymentService } from '../../services/paymentService';

// This would typically be implemented with a proper chart library like recharts or chart.js
// For brevity, we'll use dummy components here
const DummyBarChart = ({ data }: { data: any }) => (
  <Box sx={{ height: 200, bgcolor: 'background.paper', p: 2, position: 'relative' }}>
    <Typography variant="subtitle2" gutterBottom>Bar Chart - Revenue by Period</Typography>
    <Box sx={{ display: 'flex', alignItems: 'flex-end', height: '70%', mt: 2 }}>
      {data?.map((item: any, index: number) => (
        <Box 
          key={index}
          sx={{ 
            width: `${100 / (data?.length || 1)}%`, 
            mx: 1,
            height: `${(item.amount / Math.max(...data?.map((d: any) => d.amount) || 1)) * 100}%`,
            bgcolor: 'primary.main',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            minHeight: '10%',
          }}
        >
          <Typography variant="caption" sx={{ color: 'white', mb: 1 }}>${item.amount}</Typography>
        </Box>
      ))}
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
      {data?.map((item: any, index: number) => (
        <Typography key={index} variant="caption">{item.label}</Typography>
      ))}
    </Box>
  </Box>
);

const DummyPieChart = ({ data }: { data: any }) => {
  const total = data?.reduce((sum: number, item: any) => sum + item.value, 0) || 1;
  
  return (
    <Box sx={{ height: 200, bgcolor: 'background.paper', p: 2, position: 'relative' }}>
      <Typography variant="subtitle2" gutterBottom>Pie Chart - Status Distribution</Typography>
      <Box sx={{ display: 'flex', height: '70%', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Box sx={{ 
          width: 120, 
          height: 120, 
          borderRadius: '50%', 
          position: 'relative',
          overflow: 'hidden',
        }}>
          {data?.map((item: any, index: number) => {
            const percentage = (item.value / total) * 100;
            const previousItems = data.slice(0, index);
            const previousTotal = previousItems.reduce((sum: number, prev: any) => sum + (prev.value / total) * 100, 0);
            
            return (
              <Box 
                key={index}
                sx={{ 
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  background: `conic-gradient(transparent ${previousTotal}%, ${item.color} ${previousTotal}%, ${item.color} ${previousTotal + percentage}%, transparent ${previousTotal + percentage}%)`,
                }}
              />
            );
          })}
          <Box sx={{ 
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            bgcolor: 'background.paper'
          }} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
        {data?.map((item: any, index: number) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: item.color, mr: 0.5 }} />
            <Typography variant="caption">{item.name} ({Math.round((item.value / total) * 100)}%)</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const DummyLineChart = ({ data }: { data: any }) => (
  <Box sx={{ height: 200, bgcolor: 'background.paper', p: 2, position: 'relative' }}>
    <Typography variant="subtitle2" gutterBottom>Line Chart - Payment Trends</Typography>
    <Box sx={{ display: 'flex', alignItems: 'flex-end', height: '70%', mt: 2, position: 'relative' }}>
      {data?.map((item: any, index: number) => {
        const nextItem = data[index + 1];
        if (!nextItem) return null;
        
        const startHeight = (item.amount / Math.max(...data?.map((d: any) => d.amount) || 1)) * 100;
        const endHeight = (nextItem.amount / Math.max(...data?.map((d: any) => d.amount) || 1)) * 100;
        const width = `${100 / (data?.length - 1)}%`;
        
        return (
          <Box 
            key={index}
            sx={{ 
              position: 'absolute',
              left: `${(index / (data.length - 1)) * 100}%`,
              bottom: `${startHeight}%`,
              width: width,
              height: '1px',
              background: `linear-gradient(to right, primary.main ${startHeight}%, primary.main ${endHeight}%)`
            }}
          />
        );
      })}
      
      {data?.map((item: any, index: number) => (
        <Box 
          key={`point-${index}`}
          sx={{ 
            position: 'absolute',
            left: `${(index / (data.length - 1)) * 100}%`,
            bottom: `${(item.amount / Math.max(...data?.map((d: any) => d.amount) || 1)) * 100}%`,
            width: 8,
            height: 8,
            bgcolor: 'primary.main',
            borderRadius: '50%',
            transform: 'translate(-50%, 50%)'
          }}
        />
      ))}
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
      {data?.map((item: any, index: number) => (
        index % Math.ceil(data.length / 5) === 0 ? (
          <Typography key={index} variant="caption">{item.label}</Typography>
        ) : null
      ))}
    </Box>
  </Box>
);

export const InvoiceDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [tabValue, setTabValue] = useState(0);

  // Fetch invoice analytics
  const { data: invoiceAnalytics, isLoading: loadingInvoiceAnalytics } = useQuery({
    queryKey: ['invoiceAnalytics', dateRange, period],
    queryFn: () => invoiceApi.getInvoiceAnalytics(dateRange.start, dateRange.end, period),
  });

  // Fetch payment analytics
  const { data: paymentAnalytics, isLoading: loadingPaymentAnalytics } = useQuery({
    queryKey: ['paymentAnalytics', period],
    queryFn: () => paymentService.getPaymentAnalytics(period),
  });

  // Fetch top members by invoice value
  const { data: topMembers, isLoading: loadingTopMembers } = useQuery({
    queryKey: ['topMembers', dateRange],
    queryFn: () => invoiceApi.getTopMembers(dateRange.start, dateRange.end),
  });

  // Fetch recent invoices
  const { data: recentInvoices, isLoading: loadingRecentInvoices } = useQuery({
    queryKey: ['recentInvoices'],
    queryFn: () => invoiceApi.getInvoices({ limit: 5, sort: 'createdAt:desc' }),
  });

  // Prepare chart data
  const invoiceStatusData = [
    { name: 'Paid', value: invoiceAnalytics?.countByStatus?.paid || 0, color: '#4caf50' },
    { name: 'Pending', value: invoiceAnalytics?.countByStatus?.pending || 0, color: '#ff9800' },
    { name: 'Overdue', value: invoiceAnalytics?.countByStatus?.overdue || 0, color: '#f44336' },
    { name: 'Cancelled', value: invoiceAnalytics?.countByStatus?.cancelled || 0, color: '#9e9e9e' },
  ];

  const revenueByPeriod = invoiceAnalytics?.revenueByPeriod?.map((item: any) => ({
    label: item.period,
    amount: item.amount,
  })) || [];

  const paymentTrends = paymentAnalytics?.paymentsByDay?.map((item: any) => ({
    label: format(parseISO(item.date), 'MMM d'),
    amount: item.amount,
  })) || [];

  // Filter handling
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange({ ...dateRange, start: e.target.value });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange({ ...dateRange, end: e.target.value });
  };

  const handlePeriodChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setPeriod(e.target.value as 'day' | 'week' | 'month' | 'year');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Quick date shortcuts
  const setLast7Days = () => {
    setDateRange({
      start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const setLast30Days = () => {
    setDateRange({
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const setThisMonth = () => {
    setDateRange({
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h5">Invoice & Payment Analytics</Typography>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<Calendar />}
            onClick={setLast7Days}
          >
            Last 7 Days
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Calendar />}
            onClick={setLast30Days}
          >
            Last 30 Days
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Calendar />}
            onClick={setThisMonth}
          >
            This Month
          </Button>
        </Stack>
      </Stack>

      {/* Filter Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Start Date"
            type="date"
            value={dateRange.start}
            onChange={handleStartDateChange}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="End Date"
            type="date"
            value={dateRange.end}
            onChange={handleEndDateChange}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              label="Period"
              onChange={handlePeriodChange as any}
            >
              <MenuItem value="day">Daily</MenuItem>
              <MenuItem value="week">Weekly</MenuItem>
              <MenuItem value="month">Monthly</MenuItem>
              <MenuItem value="year">Yearly</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Filter />}
            sx={{ ml: { sm: 'auto' } }}
          >
            Apply Filters
          </Button>
        </Stack>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <DollarSign size={40} color="#2196f3" />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total Revenue</Typography>
                  <Typography variant="h5">
                    ${invoiceAnalytics?.totalAmount?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <FileText size={40} color="#4caf50" />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total Invoices</Typography>
                  <Typography variant="h5">
                    {invoiceAnalytics?.totalCount || 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <ShoppingBag size={40} color="#ff9800" />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Average Invoice</Typography>
                  <Typography variant="h5">
                    ${invoiceAnalytics?.averageAmount?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <AlertTriangle size={40} color="#f44336" />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Overdue Amount</Typography>
                  <Typography variant="h5">
                    ${invoiceAnalytics?.overdueAmount?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab 
            icon={<BarChart size={16} />} 
            iconPosition="start" 
            label="Revenue Analysis" 
          />
          <Tab 
            icon={<LineChart size={16} />} 
            iconPosition="start" 
            label="Payment Trends" 
          />
          <Tab 
            icon={<TrendingUp size={16} />} 
            iconPosition="start" 
            label="Member Analysis" 
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ height: '100%' }}>
              {loadingInvoiceAnalytics ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DummyBarChart data={revenueByPeriod} />
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: '100%' }}>
              {loadingInvoiceAnalytics ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DummyPieChart data={invoiceStatusData} />
              )}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6">Recent Invoices</Typography>
              </Box>
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Member</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingRecentInvoices ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : recentInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">No recent invoices found.</TableCell>
                      </TableRow>
                    ) : (
                      recentInvoices?.map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.memberName}</TableCell>
                          <TableCell>{format(parseISO(invoice.createdAt), 'PP')}</TableCell>
                          <TableCell>{format(parseISO(invoice.dueDate), 'PP')}</TableCell>
                          <TableCell>${invoice.totalAmount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={invoice.status}
                              color={
                                invoice.status === 'paid' ? 'success' :
                                invoice.status === 'pending' ? 'warning' :
                                invoice.status === 'overdue' ? 'error' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper>
              {loadingPaymentAnalytics ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DummyLineChart data={paymentTrends} />
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <TrendingUp size={40} color="#4caf50" />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Successful Payments</Typography>
                    <Typography variant="h5">
                      {paymentAnalytics?.successfulPayments || 0}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <TrendingDown size={40} color="#f44336" />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Total Refunded</Typography>
                    <Typography variant="h5">
                      ${paymentAnalytics?.refundedAmount?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6">Payment Method Distribution</Typography>
              </Box>
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Payment Method</TableCell>
                      <TableCell>Transaction Count</TableCell>
                      <TableCell>Total Amount</TableCell>
                      <TableCell>Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingPaymentAnalytics ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : paymentAnalytics?.paymentMethodBreakdown?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No payment data available.</TableCell>
                      </TableRow>
                    ) : (
                      paymentAnalytics?.paymentMethodBreakdown?.map((method: any, index: number) => {
                        const percentage = (method.amount / paymentAnalytics.totalAmount) * 100;
                        return (
                          <TableRow key={index}>
                            <TableCell>{method.method}</TableCell>
                            <TableCell>{method.count}</TableCell>
                            <TableCell>${method.amount.toFixed(2)}</TableCell>
                            <TableCell>{percentage.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6">Top Members by Invoice Value</Typography>
              </Box>
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell>Total Invoices</TableCell>
                      <TableCell>Total Amount</TableCell>
                      <TableCell>Paid Amount</TableCell>
                      <TableCell>Outstanding</TableCell>
                      <TableCell>Payment Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingTopMembers ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : topMembers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">No member data available.</TableCell>
                      </TableRow>
                    ) : (
                      topMembers?.map((member: any) => {
                        const paymentRate = (member.paidAmount / member.totalAmount) * 100;
                        return (
                          <TableRow key={member.id}>
                            <TableCell>{member.name}</TableCell>
                            <TableCell>{member.invoiceCount}</TableCell>
                            <TableCell>${member.totalAmount.toFixed(2)}</TableCell>
                            <TableCell>${member.paidAmount.toFixed(2)}</TableCell>
                            <TableCell>${(member.totalAmount - member.paidAmount).toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={`${paymentRate.toFixed(0)}%`}
                                color={
                                  paymentRate >= 90 ? 'success' :
                                  paymentRate >= 70 ? 'info' :
                                  paymentRate >= 50 ? 'warning' : 'error'
                                }
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Export Actions */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => {
              // Implementation for exporting to CSV would go here
              alert('Export to CSV functionality would be implemented here');
            }}
          >
            Export to CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileText />}
            onClick={() => {
              // Implementation for generating PDF report would go here
              alert('Generate PDF report functionality would be implemented here');
            }}
          >
            Generate PDF Report
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
