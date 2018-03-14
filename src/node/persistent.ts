import 'source-map-support/register';

import { Store } from './store';

export function persistent(target: any, key: string): void {
  const store = Store.getInstance();
  let value: any = store.get(key);

  Object.defineProperty(target, key, {
    get(): any {
      return value !== undefined ? value : store.get(key);
    },
    set(val: any): void {
      value = val;
      store.set(key, val);
    },
  });
}
