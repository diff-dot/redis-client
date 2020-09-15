import { ServerType } from '../type/ServerType';

export interface RedisBaseOptions {
  type: ServerType;
  connectionKey?: string;
  keyPrefix?: string;
}
