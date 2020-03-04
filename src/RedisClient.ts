'use strict';

import IORedis from 'ioredis';
import { ConfigManager, RedisConfig } from '@diff./config-manager';

const retryStrategy = function(times: number) {
  return Math.min(times * 300, 10000);
};

export class RedisClient {
  private static readonly hostClientMap: Map<string, IORedis.Redis> = new Map();
  private static readonly custerClientMap: Map<string, IORedis.Cluster> = new Map();

  public static host(host: string, config: ConfigManager<RedisConfig>): IORedis.Redis {
    let client = this.hostClientMap.get(host);
    if (client) return client;

    const connInfo = config.data.redis.hosts ? config.data.redis.hosts[host] : undefined;
    if (!connInfo) throw new Error(`undefined redis host : ${host}`);

    client = new IORedis({
      host: connInfo.host,
      port: connInfo.port,
      retryStrategy: retryStrategy,
      keyPrefix: config.data.redis.keyPrefix
    });

    this.hostClientMap.set(host, client);
    return client;
  }

  public static cluster(host: string, config: ConfigManager<RedisConfig>): IORedis.Cluster {
    let client = this.custerClientMap.get(host);
    if (client) return client;

    const connInfo = config.data.redis.clusters ? config.data.redis.clusters[host] : undefined;
    if (!connInfo) throw new Error(`undefined redis host : ${host}`);

    client = new IORedis.Cluster(connInfo.nodes, {
      scaleReads: connInfo.scaleReads,
      clusterRetryStrategy: retryStrategy,
      redisOptions: {
        keyPrefix: config.data.redis.keyPrefix
      }
    });

    this.custerClientMap.set(host, client);
    return client;
  }
}
