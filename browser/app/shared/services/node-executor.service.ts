import { Injectable } from '@angular/core';

import { Command } from '../../../../shared/interfaces';

const ipc = window.require('ipc-promise');

@Injectable()
export class NodeExecutorService {
  async exec(executor: string, name: string, args?: any[]): Promise<any> {
    const command: Command = { name, args };
    return ipc.send(executor, command);
  }
}
