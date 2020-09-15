import { Redis, Cluster } from 'ioredis';
import ArrayUtils from './util/ArrayUtils';
import { PipelineCmd } from './PipelineCmd';

/**
 * 키별로 pipeline 을 분리하여 cluster mode에서도 안전하게 일괄 요청이 가능하도록 지원
 */
const BULK_REQUEST_SIZE = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PipelineResult = { cmd: PipelineCmd; result?: any; error?: Error }[];
export type PipelineAddParams = { key: string; cmd: PipelineCmd };
export type PipelineQueue = { key: string; cmd: PipelineCmd; seq: number }[];

export class ClusterSafePipeline {
  public readonly client: Redis | Cluster;
  private readonly isCluster: boolean;

  private queue: PipelineQueue;
  private seqCursor: number;

  public constructor(args: { client: Redis | Cluster }) {
    const { client } = args;
    this.client = client;
    this.isCluster = this.client.constructor.name == 'Cluster';

    this.queue = [];
    this.seqCursor = 0;
  }

  public clear(): ClusterSafePipeline {
    this.seqCursor = 0;
    this.queue = [];

    return this;
  }

  public size(): number {
    return this.queue.length;
  }

  public add(params: PipelineAddParams): ClusterSafePipeline;
  public add(paramsArray: PipelineAddParams[]): ClusterSafePipeline;
  public add(key: string, cmd: PipelineCmd): ClusterSafePipeline;
  public add(keyOrParams: string | PipelineAddParams | PipelineAddParams[], cmd?: PipelineCmd): ClusterSafePipeline {
    if (Array.isArray(keyOrParams)) {
      for (const item of keyOrParams) {
        this.queue.push({ key: item.key, cmd: item.cmd, seq: this.seqCursor });
        this.seqCursor++;
      }
    } else if (typeof keyOrParams === 'object') {
      this.queue.push({ key: keyOrParams.key, cmd: keyOrParams.cmd, seq: this.seqCursor });
      this.seqCursor++;
    } else if (cmd) {
      this.queue.push({ key: keyOrParams, cmd: cmd, seq: this.seqCursor });
      this.seqCursor++;
    }

    return this;
  }

  public async run(): Promise<PipelineResult> {
    if (this.isCluster) {
      // 키별로 큐 분리
      const groupByKey: Map<string, PipelineQueue> = new Map();
      for (const cmd of this.queue) {
        let keyQueue = groupByKey.get(cmd.key);
        if (!keyQueue) {
          keyQueue = [];
          groupByKey.set(cmd.key, keyQueue);
        }

        keyQueue.push(cmd);
      }

      // 키별 큐 실행
      const result: PipelineResult = [];
      for (const key of groupByKey.keys()) {
        const keyQueue = groupByKey.get(key);
        if (!keyQueue) continue;

        // 큐에 쌓인 커멘드 순서와 결과의 순서를 통일
        const particalRes = await this.runAtOnce(keyQueue);
        for (let i = 0; i < particalRes.length; i++) {
          if (!particalRes[i]) continue;
          result[i] = particalRes[i];
        }
      }
      return result;
    } else {
      return this.runAtOnce(this.queue);
    }
  }

  private async runAtOnce(cmds: PipelineQueue): Promise<PipelineResult> {
    const results: PipelineResult = [];

    const chunks = ArrayUtils.chunk(cmds, BULK_REQUEST_SIZE);
    for (const chunk of chunks) {
      const pipeline = (this.client as Redis).pipeline(chunk.map(q => [...q.cmd.toArray()]));
      const chunkResult = await pipeline.exec();
      for (let i = 0; i < chunkResult.length; i++) {
        const [error, result] = chunkResult[i];
        results[chunk[i].seq] = { cmd: chunk[i].cmd, result, error: error || undefined };
      }
    }

    return results;
  }
}
