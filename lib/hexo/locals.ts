import { Cache } from 'hexo-util';

class Locals {
  public cache: InstanceType<typeof Cache>;
  public getters: Record<string, () => any>;

  constructor() {
    this.cache = new Cache();
    this.getters = {};
  }

  get(name: string): any {
    if (typeof name !== 'string') throw new TypeError('name must be a string!');

    return this.cache.apply(name, () => {
      const getter = this.getters[name];
      if (!getter) return;

      return getter();
    });
  }

  set(name: string, value: any): this {
    if (typeof name !== 'string') throw new TypeError('name must be a string!');
    if (value == null) throw new TypeError('value is required!');

    const getter = typeof value === 'function' ? value : () => value;

    this.getters[name] = getter;
    this.cache.del(name);

    return this;
  }

  remove(name: string): this {
    if (typeof name !== 'string') throw new TypeError('name must be a string!');

    this.getters[name] = null;
    this.cache.del(name);

    return this;
  }

  invalidate(): this {
    this.cache.flush();

    return this;
  }

  toObject(): Record<string, any> {
    const result = {};
    const keys = Object.keys(this.getters);

    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      const item = this.get(key);

      if (item != null) result[key] = item;
    }

    return result;
  }
}

export = Locals;
