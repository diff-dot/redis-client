import { ConfigData } from '@diff./config-manager';
import { HostOptions } from './HostOptions';
import { ClusterOptions } from './ClusterOptions';

export interface RedisConfig extends ConfigData {
  redis: {
    hosts?: {
      [key: string]: HostOptions;
    };
    clusters?: {
      [key: string]: ClusterOptions;
    };
  };
}
