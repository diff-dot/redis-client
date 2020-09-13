export class PipelineCmd {
  private cmd: string[];

  constructor(...cmd: string[]) {
    this.cmd = cmd;
  }

  // pipeline result에서의 변별을 위한 커멘드 해시
  public hash(): string {
    return this.cmd.join('#');
  }

  public toArray(): string[] {
    return this.cmd;
  }
}
