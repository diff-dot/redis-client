'use strict';

import IORedis from 'ioredis';
import { ConfigManager } from '@diff./config-manager';
import { RedisConfig } from './RedisConfig';

const retryStrategy = function(times: number) {
  return Math.min(times * 300, 10000);
};

export class RedisClient {
  private static readonly hostClientMap: Map<string, IORedis.Redis> = new Map();
  private static readonly custerClientMap: Map<string, IORedis.Cluster> = new Map();
  private static config?: ConfigManager<RedisConfig>;

  public static setConfig(config: ConfigManager<RedisConfig>) {
    this.config = config;
  }

  public static host(host: string): IORedis.Redis {
    if (!this.config) throw Error('No preference has been specified.');

    let client = this.hostClientMap.get(host);
    if (client) return client;

    const connInfo = this.config.data.redis.hosts ? this.config.data.redis.hosts[host] : undefined;
    if (!connInfo) throw new Error(`undefined redis host : ${host}`);

    client = new IORedis({
      host: connInfo.host,
      port: connInfo.port,
      retryStrategy: retryStrategy,
      keyPrefix: this.config.data.redis.keyPrefix
    });

    this.hostClientMap.set(host, client);
    return client;
  }

  public static cluster(host: string): IORedis.Cluster {
    if (!this.config) throw Error('No preference has been specified.');

    let client = this.custerClientMap.get(host);
    if (client) return client;

    const connInfo = this.config.data.redis.clusters ? this.config.data.redis.clusters[host] : undefined;
    if (!connInfo) throw new Error(`undefined redis host : ${host}`);

    client = new IORedis.Cluster(connInfo.nodes, {
      scaleReads: connInfo.scaleReads,
      clusterRetryStrategy: retryStrategy,
      redisOptions: {
        keyPrefix: this.config.data.redis.keyPrefix
      }
    });

    this.custerClientMap.set(host, client);
    return client;
  }
}
