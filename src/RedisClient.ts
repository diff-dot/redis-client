'use strict';

import { RedisHostOptions } from './option/RedisHostOptions';
import { RedisClusterOptions } from './option/RedisClusterOptions';
import { RedisBaseOptions } from './option/RedisBaseOptions';
import IORedis from 'ioredis';

/**
 * 커넥션을 잃었을 경우 최소 0.1초 최대 1초의 간격으로 재접속 시도
 */
const RETRY_INC_DURATION = 100; // ms
const RETRY_MAX_DURATION = 500; // ms

/**
 * 레디스와의 커넥션이 상실된 상태에서 요청이 수신되었을 경우
 * MAX_RETRIES_PER_REQUEST 만큼 재접속 시도 후 성공시 일괄 결과 반환, 실패시 에러 반환
 * ( standalone 서버 한정 옵션  )
 *
 * < 주의사항 >
 * 크기를 너무 크게 설정할 경우 최대 MAX_RETRIES_PER_REQUEST*RETRY_MAX_DURATION 만큼 응답 지연이 발생할 수 있고
 * API 서버의 경우 사용자 커넥션의 급격한 증가로 연쇄 장애를 발생시킬 수 있으므로 설정에 주의 요망
 * @see https://github.com/luin/ioredis#auto-reconnect
 */
const MAX_RETRIES_PER_REQUEST = 3;

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
      maxRetriesPerRequest: MAX_RETRIES_PER_REQUEST,
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
