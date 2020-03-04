import { ConfigData } from '@diff./config-manager';

export interface RedisConfig extends ConfigData {
  redis: {
    hosts?: {
      [key: string]: {
        host: string;
        port: number;
      };
    };
    clusters?: {
      [key: string]: {
        nodes: { host: string; port: number }[];
        scaleReads?: string;
      };
    };
    keyPrefix?: string;
  };
}
