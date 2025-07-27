import { WebSocketService } from './websocket';

interface ConnectionPoolConfig {
  maxConnections: number;
  healthCheckInterval: number;
  reconnectAttempts: number;
  loadBalancingStrategy: 'round-robin' | 'least-connections' | 'health-weighted';
}

interface ConnectionMetrics {
  latency: number;
  throughput: number;
  errorRate: number;
  lastHealthCheck: number;
  connectionQuality: number;
}

interface LoadBalancingResult {
  connection: WebSocketService;
  poolId: string;
  reason: string;
}

class ConnectionPool {
  private connections: Map<string, WebSocketService> = new Map();
  private metrics: Map<string, ConnectionMetrics> = new Map();
  private config: ConnectionPoolConfig;
  private poolId: string;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private lastUsed = 0; // For round-robin
  
  constructor(poolId: string, config: ConnectionPoolConfig) {
    this.poolId = poolId;
    this.config = config;
    this.startHealthChecking();
  }

  async addConnection(connectionId: string, wsUrl: string): Promise<void> {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error(`Pool ${this.poolId} is at maximum capacity`);
    }

    const connection = new WebSocketService(wsUrl);
    this.connections.set(connectionId, connection);
    
    // Initialize metrics
    this.metrics.set(connectionId, {
      latency: 0,
      throughput: 0,
      errorRate: 0,
      lastHealthCheck: Date.now(),
      connectionQuality: 100
    });

    console.log(`Added connection ${connectionId} to pool ${this.poolId}`);
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(connectionId);
      this.metrics.delete(connectionId);
      console.log(`Removed connection ${connectionId} from pool ${this.poolId}`);
    }
  }

  getOptimalConnection(): WebSocketService | null {
    const healthyConnections = this.getHealthyConnections();
    
    if (healthyConnections.length === 0) {
      console.warn(`No healthy connections available in pool ${this.poolId}`);
      return null;
    }

    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        return this.getRoundRobinConnection(healthyConnections);
      case 'least-connections':
        return this.getLeastConnectionsConnection(healthyConnections);
      case 'health-weighted':
        return this.getHealthWeightedConnection(healthyConnections);
      default:
        return healthyConnections[0].connection;
    }
  }

  private getHealthyConnections(): Array<{ id: string; connection: WebSocketService; metrics: ConnectionMetrics }> {
    const healthy: Array<{ id: string; connection: WebSocketService; metrics: ConnectionMetrics }> = [];
    
    this.connections.forEach((connection, id) => {
      if (connection.getConnectionStatus() === 'connected') {
        const metrics = this.metrics.get(id);
        if (metrics && metrics.connectionQuality > 50) { // Minimum quality threshold
          healthy.push({ id, connection, metrics });
        }
      }
    });
    
    return healthy;
  }

  private getRoundRobinConnection(connections: Array<{ id: string; connection: WebSocketService; metrics: ConnectionMetrics }>): WebSocketService {
    this.lastUsed = (this.lastUsed + 1) % connections.length;
    return connections[this.lastUsed].connection;
  }

  private getLeastConnectionsConnection(connections: Array<{ id: string; connection: WebSocketService; metrics: ConnectionMetrics }>): WebSocketService {
    // For simplicity, we'll use throughput as a proxy for current connections
    let leastLoaded = connections[0];
    
    for (const conn of connections) {
      if (conn.metrics.throughput < leastLoaded.metrics.throughput) {
        leastLoaded = conn;
      }
    }
    
    return leastLoaded.connection;
  }

  private getHealthWeightedConnection(connections: Array<{ id: string; connection: WebSocketService; metrics: ConnectionMetrics }>): WebSocketService {
    // Select connection based on weighted random selection using connection quality
    const totalWeight = connections.reduce((sum, conn) => sum + conn.metrics.connectionQuality, 0);
    let random = Math.random() * totalWeight;
    
    for (const conn of connections) {
      random -= conn.metrics.connectionQuality;
      if (random <= 0) {
        return conn.connection;
      }
    }
    
    // Fallback to first connection
    return connections[0].connection;
  }

  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private performHealthChecks(): void {
    this.connections.forEach((connection, id) => {
      const metrics = this.metrics.get(id);
      if (!metrics) return;

      // Update connection quality based on status and performance
      const status = connection.getConnectionStatus();
      let quality = 0;

      switch (status) {
        case 'connected':
          quality = 100 - (metrics.latency / 10) - (metrics.errorRate * 50);
          break;
        case 'connecting':
          quality = 50;
          break;
        case 'disconnected':
        case 'failed':
        case 'authentication_failed':
          quality = 0;
          break;
      }

      metrics.connectionQuality = Math.max(0, Math.min(100, quality));
      metrics.lastHealthCheck = Date.now();

      // Log unhealthy connections
      if (quality < 50) {
        console.warn(`Connection ${id} in pool ${this.poolId} is unhealthy (quality: ${quality})`);
      }
    });
  }

  updateConnectionMetrics(connectionId: string, latency: number, throughput: number, errorRate: number): void {
    const metrics = this.metrics.get(connectionId);
    if (metrics) {
      metrics.latency = latency;
      metrics.throughput = throughput;
      metrics.errorRate = errorRate;
    }
  }

  getPoolMetrics() {
    const connections = Array.from(this.connections.keys());
    const healthyConnections = this.getHealthyConnections().length;
    const totalConnections = connections.length;
    
    const avgLatency = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.latency, 0) / Math.max(1, totalConnections);
    
    const avgQuality = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.connectionQuality, 0) / Math.max(1, totalConnections);

    return {
      poolId: this.poolId,
      totalConnections,
      healthyConnections,
      avgLatency,
      avgQuality,
      strategy: this.config.loadBalancingStrategy,
      metrics: Object.fromEntries(this.metrics)
    };
  }

  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Disconnect all connections
    this.connections.forEach((connection) => {
      connection.disconnect();
    });
    
    this.connections.clear();
    this.metrics.clear();
    console.log(`Destroyed connection pool ${this.poolId}`);
  }
}

export class ConnectionPoolManager {
  private pools: Map<string, ConnectionPool> = new Map();
  private defaultConfig: ConnectionPoolConfig = {
    maxConnections: 5,
    healthCheckInterval: 30000, // 30 seconds
    reconnectAttempts: 3,
    loadBalancingStrategy: 'health-weighted'
  };
  private roundRobinIndex = 0;

  createPool(poolId: string, config?: Partial<ConnectionPoolConfig>): void {
    if (this.pools.has(poolId)) {
      throw new Error(`Pool ${poolId} already exists`);
    }

    const poolConfig = { ...this.defaultConfig, ...config };
    const pool = new ConnectionPool(poolId, poolConfig);
    this.pools.set(poolId, pool);
    
    console.log(`Created connection pool ${poolId} with config:`, poolConfig);
  }

  async addConnectionToPool(poolId: string, connectionId: string, wsUrl: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} does not exist`);
    }

    await pool.addConnection(connectionId, wsUrl);
  }

  removeConnectionFromPool(poolId: string, connectionId: string): void {
    const pool = this.pools.get(poolId);
    if (pool) {
      pool.removeConnection(connectionId);
    }
  }

  getOptimalConnection(poolId?: string): LoadBalancingResult | null {
    if (poolId) {
      // Get connection from specific pool
      const pool = this.pools.get(poolId);
      if (!pool) {
        console.warn(`Pool ${poolId} not found`);
        return null;
      }

      const connection = pool.getOptimalConnection();
      if (connection) {
        return {
          connection,
          poolId,
          reason: `Selected from pool ${poolId}`
        };
      }
    }

    // Get connection from any available pool using round-robin
    const poolIds = Array.from(this.pools.keys());
    if (poolIds.length === 0) {
      console.warn('No pools available');
      return null;
    }

    // Try pools in round-robin order
    for (let i = 0; i < poolIds.length; i++) {
      const currentIndex = (this.roundRobinIndex + i) % poolIds.length;
      const currentPoolId = poolIds[currentIndex];
      const pool = this.pools.get(currentPoolId);
      
      if (pool) {
        const connection = pool.getOptimalConnection();
        if (connection) {
          this.roundRobinIndex = (currentIndex + 1) % poolIds.length;
          return {
            connection,
            poolId: currentPoolId,
            reason: `Auto-selected from pool ${currentPoolId} (round-robin)`
          };
        }
      }
    }

    console.warn('No healthy connections available in any pool');
    return null;
  }

  updateConnectionMetrics(poolId: string, connectionId: string, metrics: { latency: number; throughput: number; errorRate: number }): void {
    const pool = this.pools.get(poolId);
    if (pool) {
      pool.updateConnectionMetrics(connectionId, metrics.latency, metrics.throughput, metrics.errorRate);
    }
  }

  getAllPoolMetrics(): { [key: string]: any } {
    const allMetrics: { [key: string]: any } = {};
    this.pools.forEach((pool, poolId) => {
      allMetrics[poolId] = pool.getPoolMetrics();
    });
    return allMetrics;
  }

  getSystemHealth() {
    const pools = Array.from(this.pools.values());
    const totalPools = pools.length;
    const healthyPools = pools.filter(pool => {
      const metrics = pool.getPoolMetrics();
      return metrics.healthyConnections > 0;
    }).length;

    const totalConnections = pools.reduce((sum, pool) => {
      return sum + pool.getPoolMetrics().totalConnections;
    }, 0);

    const healthyConnections = pools.reduce((sum, pool) => {
      return sum + pool.getPoolMetrics().healthyConnections;
    }, 0);

    const avgQuality = pools.reduce((sum, pool) => {
      return sum + pool.getPoolMetrics().avgQuality;
    }, 0) / Math.max(1, totalPools);

    return {
      totalPools,
      healthyPools,
      totalConnections,
      healthyConnections,
      avgQuality,
      connectionHealthRatio: healthyConnections / Math.max(1, totalConnections),
      poolHealthRatio: healthyPools / Math.max(1, totalPools),
      status: healthyPools > 0 ? 'healthy' : 'degraded'
    };
  }

  destroyPool(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (pool) {
      pool.destroy();
      this.pools.delete(poolId);
      console.log(`Destroyed pool ${poolId}`);
    }
  }

  destroyAllPools(): void {
    this.pools.forEach((pool) => {
      pool.destroy();
    });
    this.pools.clear();
    console.log('Destroyed all connection pools');
  }
}

// Export singleton instance
export const connectionPoolManager = new ConnectionPoolManager();
