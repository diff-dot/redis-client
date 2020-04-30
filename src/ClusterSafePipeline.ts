import { Redis, Cluster } from 'ioredis';
import ArrayUtils from './util/ArrayUtils';
import { PipelineCmd } from './PipelineCmd';

/**
 * 키별로 pipeline 을 구성하여 cluster mode에서도 안전하게 일괄 요청이 가능하도록 지원
 */
const BULK_REQUEST_SIZE = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PipelineResult = { successed: { cmd: string[]; result: any }[]; failed: { cmd: string[]; result: Error }[] };
export type PipelineAddParams = { key: string; cmd: PipelineCmd };

export class ClusterSafePipeline {
  public readonly client: Redis | Cluster;
  private readonly disableClusterSafe: boolean;

  private cmds: Map<string, PipelineCmd[]> = new Map();
  public constructor(args: { client: Redis | Cluster; disableClusterSafe?: boolean }) {
    const { client, disableClusterSafe = false } = args;
    this.client = client;
    this.disableClusterSafe = disableClusterSafe;
  }

  public clear(): void {
    this.cmds.clear();
  }

  public size(): number {
    let totalSize = 0;
    this.cmds.forEach(cmds => {
      totalSize += cmds.length;
    });
    return totalSize;
  }

  public add(params: PipelineAddParams): void;
  public add(paramsArray: PipelineAddParams[]): void;
  public add(key: string, cmd: PipelineCmd): void;
  public add(keyOrParams: string | PipelineAddParams | PipelineAddParams[], cmd?: PipelineCmd): void {
    if (Array.isArray(keyOrParams)) {
      for (const item of keyOrParams) {
        if (!this.cmds.has(item.key)) this.cmds.set(item.key, []);
        this.cmds.get(item.key)?.push(item.cmd);
      }
    } else if (typeof keyOrParams === 'object') {
      if (!this.cmds.has(keyOrParams.key)) this.cmds.set(keyOrParams.key, []);
      this.cmds.get(keyOrParams.key)?.push(keyOrParams.cmd);
    } else {
      if (!this.cmds.has(keyOrParams)) this.cmds.set(keyOrParams, []);
      if (cmd) this.cmds.get(keyOrParams)?.push(cmd);
    }
  }

  public async run(): Promise<PipelineResult> {
    if (this.disableClusterSafe) {
      const cmds: PipelineCmd[] = [];
      for (const cmdsByKey of this.cmds.values()) {
        cmds.push(...cmdsByKey);
      }
      return this.runAtOnce(cmds);
    } else {
      const results: PipelineResult = {
        successed: [],
        failed: []
      };

      for (const key of this.cmds.keys()) {
        const cmdsByKey = this.cmds.get(key);
        if (!cmdsByKey) continue;

        const res = await this.runAtOnce(cmdsByKey);
        results.successed.push(...res.successed);
        results.failed.push(...res.failed);
      }
      return results;
    }
  }

  private async runAtOnce(cmds: PipelineCmd[]): Promise<PipelineResult> {
    const results: PipelineResult = {
      successed: [],
      failed: []
    };

    const chunks = ArrayUtils.chunk(cmds, BULK_REQUEST_SIZE);
    for (const chunk of chunks) {
      const pipeline = (this.client as Redis).pipeline(chunk.map(v => v.toArray()));
      const chunkResult = await pipeline.exec();
      for (let i = 0; i < chunkResult.length; i++) {
        const [error, result] = chunkResult[i];
        if (error instanceof Error) {
          results.failed.push({ cmd: chunk[i].toArray(), result });
        } else {
          results.successed.push({ cmd: chunk[i].toArray(), result });
        }
      }
    }

    return results;
  }
}
