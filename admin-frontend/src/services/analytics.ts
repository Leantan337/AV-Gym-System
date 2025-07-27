import { connectionPoolManager } from './connectionPool';

interface AnalyticsEvent {
  timestamp: number;
  type: 'connection' | 'performance' | 'error' | 'pool' | 'user';
  category: string;
  action: string;
  value?: number;
  metadata: { [key: string]: any };
}

interface PerformanceMetrics {
  timestamp: number;
  connectionCount: number;
  avgLatency: number;
  avgThroughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  poolHealth: number;
}

interface Analytics {
  events: AnalyticsEvent[];
  metrics: PerformanceMetrics[];
  aggregations: {
    hourly: { [hour: string]: PerformanceMetrics };
    daily: { [day: string]: PerformanceMetrics };
    poolStats: { [poolId: string]: any };
  };
}

class AnalyticsEngine {
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetrics[] = [];
  private maxEvents = 10000;
  private maxMetrics = 1000;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private aggregationTimer: ReturnType<typeof setInterval> | null = null;
  private analytics: Analytics = {
    events: [],
    metrics: [],
    aggregations: {
      hourly: {},
      daily: {},
      poolStats: {}
    }
  };

  constructor() {
    this.startMetricsCollection();
    this.startAggregation();
  }

  // Event tracking
  trackEvent(type: AnalyticsEvent['type'], category: string, action: string, value?: number, metadata: any = {}): void {
    const event: AnalyticsEvent = {
      timestamp: Date.now(),
      type,
      category,
      action,
      value,
      metadata
    };

    this.events.push(event);
    
    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    console.log(`Analytics Event: ${type}/${category}/${action}`, event);
  }

  // Connection events
  trackConnectionEvent(action: 'connected' | 'disconnected' | 'failed' | 'reconnected', poolId?: string, connectionId?: string): void {
    this.trackEvent('connection', 'websocket', action, 1, {
      poolId,
      connectionId,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  // Performance events
  trackPerformanceEvent(action: string, value: number, metadata: any = {}): void {
    this.trackEvent('performance', 'metrics', action, value, metadata);
  }

  // Error events
  trackErrorEvent(action: string, error: Error, metadata: any = {}): void {
    this.trackEvent('error', 'system', action, 1, {
      message: error.message,
      stack: error.stack,
      ...metadata
    });
  }

  // Pool events
  trackPoolEvent(action: string, poolId: string, metadata: any = {}): void {
    this.trackEvent('pool', 'management', action, 1, {
      poolId,
      ...metadata
    });
  }

  // User interaction events
  trackUserEvent(action: string, metadata: any = {}): void {
    this.trackEvent('user', 'interaction', action, 1, {
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      ...metadata
    });
  }

  // Metrics collection
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Collect metrics every 10 seconds
  }

  private collectSystemMetrics(): void {
    const poolMetrics = connectionPoolManager.getAllPoolMetrics();
    const systemHealth = connectionPoolManager.getSystemHealth();
    
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      connectionCount: systemHealth.totalConnections,
      avgLatency: this.calculateAvgLatency(poolMetrics),
      avgThroughput: this.calculateAvgThroughput(poolMetrics),
      errorRate: this.calculateErrorRate(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      poolHealth: systemHealth.avgQuality
    };

    this.metrics.push(metrics);
    
    // Maintain max metrics limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Track performance events
    this.trackPerformanceEvent('metrics_collected', 1, {
      connectionCount: metrics.connectionCount,
      avgLatency: metrics.avgLatency,
      poolHealth: metrics.poolHealth
    });
  }

  private calculateAvgLatency(poolMetrics: any): number {
    const pools = Object.values(poolMetrics) as any[];
    if (pools.length === 0) return 0;
    
    const totalLatency = pools.reduce((sum, pool) => sum + pool.avgLatency, 0);
    return totalLatency / pools.length;
  }

  private calculateAvgThroughput(poolMetrics: any): number {
    const pools = Object.values(poolMetrics) as any[];
    if (pools.length === 0) return 0;
    
    // Calculate based on connection health as a proxy for throughput
    const totalHealth = pools.reduce((sum, pool) => sum + pool.avgQuality, 0);
    return totalHealth / pools.length;
  }

  private calculateErrorRate(): number {
    const recentEvents = this.events.filter(e => 
      e.type === 'error' && e.timestamp > Date.now() - 60000 // Last minute
    );
    
    const totalEvents = this.events.filter(e => 
      e.timestamp > Date.now() - 60000
    ).length;
    
    return totalEvents > 0 ? (recentEvents.length / totalEvents) * 100 : 0;
  }

  private getMemoryUsage(): number {
    // Estimate memory usage based on stored data
    const eventsSize = this.events.length * 200; // Rough estimate per event
    const metricsSize = this.metrics.length * 100; // Rough estimate per metric
    return (eventsSize + metricsSize) / (1024 * 1024); // Convert to MB
  }

  private getCPUUsage(): number {
    // Simple CPU usage estimation based on event frequency
    const recentEvents = this.events.filter(e => 
      e.timestamp > Date.now() - 5000 // Last 5 seconds
    );
    
    // Scale event frequency to CPU percentage (rough estimation)
    return Math.min((recentEvents.length / 10) * 100, 100);
  }

  // Data aggregation
  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregateData();
    }, 60000); // Aggregate every minute
  }

  private aggregateData(): void {
    this.aggregateHourlyMetrics();
    this.aggregateDailyMetrics();
    this.aggregatePoolStats();
  }

  private aggregateHourlyMetrics(): void {
    const now = new Date();
    const hour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
    
    const hourMetrics = this.metrics.filter(m => {
      const metricDate = new Date(m.timestamp);
      const metricHour = `${metricDate.getFullYear()}-${String(metricDate.getMonth() + 1).padStart(2, '0')}-${String(metricDate.getDate()).padStart(2, '0')}-${String(metricDate.getHours()).padStart(2, '0')}`;
      return metricHour === hour;
    });

    if (hourMetrics.length > 0) {
      this.analytics.aggregations.hourly[hour] = this.aggregateMetrics(hourMetrics);
    }
  }

  private aggregateDailyMetrics(): void {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const dayMetrics = this.metrics.filter(m => {
      const metricDate = new Date(m.timestamp);
      const metricDay = `${metricDate.getFullYear()}-${String(metricDate.getMonth() + 1).padStart(2, '0')}-${String(metricDate.getDate()).padStart(2, '0')}`;
      return metricDay === day;
    });

    if (dayMetrics.length > 0) {
      this.analytics.aggregations.daily[day] = this.aggregateMetrics(dayMetrics);
    }
  }

  private aggregatePoolStats(): void {
    const poolMetrics = connectionPoolManager.getAllPoolMetrics();
    this.analytics.aggregations.poolStats = poolMetrics;
  }

  private aggregateMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const length = metrics.length;
    
    return {
      timestamp: Date.now(),
      connectionCount: Math.round(metrics.reduce((sum, m) => sum + m.connectionCount, 0) / length),
      avgLatency: metrics.reduce((sum, m) => sum + m.avgLatency, 0) / length,
      avgThroughput: metrics.reduce((sum, m) => sum + m.avgThroughput, 0) / length,
      errorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / length,
      memoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / length,
      cpuUsage: metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / length,
      poolHealth: metrics.reduce((sum, m) => sum + m.poolHealth, 0) / length
    };
  }

  // Query methods
  getEvents(filters?: {
    type?: AnalyticsEvent['type'];
    category?: string;
    action?: string;
    startTime?: number;
    endTime?: number;
  }): AnalyticsEvent[] {
    let filteredEvents = this.events;

    if (filters) {
      if (filters.type) {
        filteredEvents = filteredEvents.filter(e => e.type === filters.type);
      }
      if (filters.category) {
        filteredEvents = filteredEvents.filter(e => e.category === filters.category);
      }
      if (filters.action) {
        filteredEvents = filteredEvents.filter(e => e.action === filters.action);
      }
      if (filters.startTime) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filters.endTime!);
      }
    }

    return filteredEvents;
  }

  getMetrics(startTime?: number, endTime?: number): PerformanceMetrics[] {
    let filteredMetrics = this.metrics;

    if (startTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startTime);
    }
    if (endTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endTime);
    }

    return filteredMetrics;
  }

  getRecentMetrics(count = 100): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  getHourlyAggregations(): { [hour: string]: PerformanceMetrics } {
    return this.analytics.aggregations.hourly;
  }

  getDailyAggregations(): { [day: string]: PerformanceMetrics } {
    return this.analytics.aggregations.daily;
  }

  getAnalyticsSummary(): {
    totalEvents: number;
    recentEvents: number;
    errorRate: number;
    avgPerformance: Partial<PerformanceMetrics>;
    topCategories: { [category: string]: number };
    recentTrends: {
      latencyTrend: 'up' | 'down' | 'stable';
      errorTrend: 'up' | 'down' | 'stable';
      connectionTrend: 'up' | 'down' | 'stable';
    };
  } {
    const recentEvents = this.getEvents({
      startTime: Date.now() - 3600000 // Last hour
    });

    const recentMetrics = this.getRecentMetrics(60); // Last 60 metrics
    const avgPerformance = recentMetrics.length > 0 ? this.aggregateMetrics(recentMetrics) : {};

    // Count events by category
    const topCategories: { [category: string]: number } = {};
    recentEvents.forEach(e => {
      topCategories[e.category] = (topCategories[e.category] || 0) + 1;
    });

    // Calculate trends
    const trends = this.calculateTrends(recentMetrics);

    return {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      errorRate: this.calculateErrorRate(),
      avgPerformance,
      topCategories,
      recentTrends: trends
    };
  }

  private calculateTrends(metrics: PerformanceMetrics[]): {
    latencyTrend: 'up' | 'down' | 'stable';
    errorTrend: 'up' | 'down' | 'stable';
    connectionTrend: 'up' | 'down' | 'stable';
  } {
    if (metrics.length < 10) {
      return {
        latencyTrend: 'stable',
        errorTrend: 'stable',
        connectionTrend: 'stable'
      };
    }

    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

    const firstAvgLatency = firstHalf.reduce((sum, m) => sum + m.avgLatency, 0) / firstHalf.length;
    const secondAvgLatency = secondHalf.reduce((sum, m) => sum + m.avgLatency, 0) / secondHalf.length;

    const firstAvgError = firstHalf.reduce((sum, m) => sum + m.errorRate, 0) / firstHalf.length;
    const secondAvgError = secondHalf.reduce((sum, m) => sum + m.errorRate, 0) / secondHalf.length;

    const firstAvgConnections = firstHalf.reduce((sum, m) => sum + m.connectionCount, 0) / firstHalf.length;
    const secondAvgConnections = secondHalf.reduce((sum, m) => sum + m.connectionCount, 0) / secondHalf.length;

    const threshold = 0.1; // 10% threshold for trend detection

    return {
      latencyTrend: Math.abs(secondAvgLatency - firstAvgLatency) / firstAvgLatency < threshold ? 'stable' :
                   secondAvgLatency > firstAvgLatency ? 'up' : 'down',
      errorTrend: Math.abs(secondAvgError - firstAvgError) / Math.max(firstAvgError, 0.1) < threshold ? 'stable' :
                 secondAvgError > firstAvgError ? 'up' : 'down',
      connectionTrend: Math.abs(secondAvgConnections - firstAvgConnections) / Math.max(firstAvgConnections, 1) < threshold ? 'stable' :
                      secondAvgConnections > firstAvgConnections ? 'up' : 'down'
    };
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  exportData(): Analytics {
    return {
      events: this.events,
      metrics: this.metrics,
      aggregations: this.analytics.aggregations
    };
  }

  clearData(): void {
    this.events = [];
    this.metrics = [];
    this.analytics.aggregations = {
      hourly: {},
      daily: {},
      poolStats: {}
    };
    console.log('Analytics data cleared');
  }

  destroy(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    console.log('Analytics engine destroyed');
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine();
export type { AnalyticsEvent, PerformanceMetrics, Analytics };
