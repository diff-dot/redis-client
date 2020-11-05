'use strict';

import { RedisHostOptions } from './option/RedisHostOptions';
import { RedisClusterOptions } from './option/RedisClusterOptions';
import { RedisBaseOptions } from './option/RedisBaseOptions';
import IORedis from 'ioredis';

const RETRY_INC_DURATION = 500; // ms
const RETRY_MAX_DURATION = 5 * 1000; // ms

const retryStrategy = function(times: number) {
  return Math.min(times * RETRY_INC_DURATION, RETRY_MAX_DURATION);
};

export class RedisClient {
  private static readonly hostClientMap: Map<string, IORedis.Redis> = new Map();
  private static readonly custerClientMap: Map<string, IORedis.Cluster> = new Map();

  public static host(options: RedisHostOptions): IORedis.Redis {
    const connectionKey = options.connectionKey || JSON.stringify(options);

    let client = this.hostClientMap.get(connectionKey);
    if (client) return client;

    client = new IORedis({
      host: options.host,
      port: options.port,
      retryStrategy: retryStrategy,
      keyPrefix: options.keyPrefix
    });

    this.hostClientMap.set(connectionKey, client);
    return client;
  }

  public static cluster(options: RedisClusterOptions): IORedis.Cluster {
    const connectionKey = options.connectionKey || JSON.stringify(options);

    let client = this.custerClientMap.get(connectionKey);
    if (client) return client;

    client = new IORedis.Cluster(options.nodes, {
      scaleReads: options.scaleReads,
      clusterRetryStrategy: retryStrategy,
      redisOptions: {
        keyPrefix: options.keyPrefix
      }
    });

    this.custerClientMap.set(connectionKey, client);
    return client;
  }

  public static client(options: RedisHostOptions): IORedis.Redis;
  public static client(options: RedisClusterOptions): IORedis.Cluster;
  public static client(options: RedisHostOptions | RedisClusterOptions): IORedis.Cluster | IORedis.Redis;
  public static client(options: RedisHostOptions | RedisClusterOptions): IORedis.Cluster | IORedis.Redis {
    if (this.isRedisClusterOptions(options)) {
      return this.cluster(options);
    } else {
      return this.host(options);
    }
  }

  private static isRedisClusterOptions(options: RedisBaseOptions): options is RedisClusterOptions {
    return options.type === 'cluster';
  }
}
