import { expect } from 'chai';
import { RedisClient, ClusterSafePipeline, PipelineCmd } from '../../src';

const TEST_KEY1 = 'testKey1';
const TEST_KEY2 = 'testKey2';

const client = RedisClient.cluster({
  type: 'cluster',
  nodes: [
    {
      host: '127.0.0.1',
      port: 7000
    }
  ]
});

describe('cluster-mode', async () => {
  before(async () => {
    await client.del(TEST_KEY1);
    await client.del(TEST_KEY2);
  });

  it('클러스터 환경의 레디스에 다수의 키 값을 변경하는 요청 일괄 처리', async () => {
    const pipeline = new ClusterSafePipeline({ client });
    const set1: { memberKey: string; score: string }[] = [
      {
        memberKey: 'mem1',
        score: '1'
      },
      {
        memberKey: 'mem2',
        score: '2'
      },
      {
        memberKey: 'mem3',
        score: '3'
      }
    ];
    for (const value of set1) pipeline.add(TEST_KEY1, new PipelineCmd('zadd', TEST_KEY1, value.score, value.memberKey));
    for (const value of set1) pipeline.add(TEST_KEY2, new PipelineCmd('zadd', TEST_KEY2, value.score, value.memberKey));

    const res = await pipeline.run();
    expect(res.length).to.be.eq(6);
    expect(res[0].cmd.hash()).to.be.eq('zadd#testKey1#1#mem1');
    expect(res[0].error).to.be.undefined;
  });
});
