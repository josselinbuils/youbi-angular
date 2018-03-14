import * as ElectronStore from 'electron-store';
import 'source-map-support/register';

export class Store {

  static instance: Store;

  static getInstance(): Store {
    if (this.instance === undefined) {
      this.instance = new Store(new ElectronStore());
    }
    return this.instance;
  }

  get(key: string): any {
    return this.internalStore.get(key);
  }

  has(key: string): boolean {
    return this.internalStore.has(key);
  }

  set(key: string | object, value: any): void {
    this.internalStore.set(key, value);
  }

  private constructor(private internalStore: ElectronStore) {}
}
