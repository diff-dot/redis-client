'use strict';

import IORedis from 'ioredis';
import { HostOptions } from './config/HostOptions';
import { ClusterOptions } from './config/ClusterOptions';

const retryStrategy = function(times: number) {
  return Math.min(times * 300, 10000);
};

export class RedisClient {
  private static readonly hostClientMap: Map<string, IORedis.Redis> = new Map();
  private static readonly custerClientMap: Map<string, IORedis.Cluster> = new Map();

  public static host(options: HostOptions): IORedis.Redis {
    const cacheKey = JSON.stringify(options);

    let client = this.hostClientMap.get(cacheKey);
    if (client) return client;

    client = new IORedis({
      host: options.host,
      port: options.port,
      retryStrategy: retryStrategy,
      keyPrefix: options.keyPrefix
    });

    this.hostClientMap.set(cacheKey, client);
    return client;
  }

  public static cluster(options: ClusterOptions): IORedis.Cluster {
    const cacheKey = JSON.stringify(options);

    let client = this.custerClientMap.get(cacheKey);
    if (client) return client;

    client = new IORedis.Cluster(options.nodes, {
      scaleReads: options.scaleReads,
      clusterRetryStrategy: retryStrategy,
      redisOptions: {
        keyPrefix: options.keyPrefix
      }
    });

    this.custerClientMap.set(cacheKey, client);
    return client;
  }
}
