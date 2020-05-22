import 'ioredis';

declare module 'ioredis' {
  interface Cluster {
    status: string;
  }
}
