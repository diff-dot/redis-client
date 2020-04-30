export interface ClusterOptions {
  nodes: { host: string; port: number }[];
  scaleReads?: string;
  keyPrefix?: string;
}
