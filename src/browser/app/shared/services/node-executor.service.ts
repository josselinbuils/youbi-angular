import { Injectable } from '@angular/core';

import { Command } from '../../../../shared/interfaces';

@Injectable()
export class NodeExecutorService {
  async exec(executor: string, name: string, args?: any[]): Promise<any> {
    const command: Command = { name, args };
    return (window as any).ipc.send(executor, command);
  }
}
