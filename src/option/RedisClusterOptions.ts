export interface RedisClusterOptions {
  nodes: { host: string; port: number }[];
  scaleReads?: string;
  keyPrefix?: string;
}
