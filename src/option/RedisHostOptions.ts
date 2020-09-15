import { RedisBaseOptions } from './RedisBaseOptions';

export interface RedisHostOptions extends RedisBaseOptions {
  /**
   * 커넥션을 이 이름으로 캐싱합니다.
   * 지정되지 않을 경우 접속정보를 해싱하여 키로 사용합니다.
   */
  type: 'standalone';
  connectionKey?: string;
  host: string;
  port: number;
  keyPrefix?: string;
}
