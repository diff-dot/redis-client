import { expect } from 'chai';
import { RedisClient } from '../../src';

describe('서버 설정에 따라 클라이언트 타입 자동 선택', async () => {
  it('Cluster 로 설정된 경우 RedisCluster 인스턴스 반환', async () => {
    const client = RedisClient.client({
      type: 'cluster',
      nodes: [
        {
          host: '127.0.0.1',
          port: 7000
        }
      ]
    });
    expect(client.constructor.name === 'RedisClient');
  });

  it('Standalone 으로 설정된 경우 RedisClient 인스턴스 반환', async () => {
    const client = RedisClient.client({
      type: 'standalone',
      host: '127.0.0.1',
      port: 6379
    });
    expect(client.constructor.name === 'Redis');
  });
});
