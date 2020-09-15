import { ServerType } from '../type/ServerType';

export interface RedisOptions {
  type: ServerType;
  connectionKey?: string;
  keyPrefix?: string;
}
