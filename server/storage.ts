import {
  type CoMapeoConfig,
  type Config,
  type InsertConfig,
  type MapeoConfig,
  configs,
} from '@shared/schema';

export interface IStorage {
  getConfigByHash(hashId: string): Promise<Config | undefined>;
  createConfig(config: InsertConfig): Promise<Config>;
  updateConfig(hashId: string, config: InsertConfig): Promise<Config | undefined>;
  deleteConfig(hashId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private configs: Map<string, Config>;
  currentId: number;

  constructor() {
    this.configs = new Map();
    this.currentId = 1;
  }

  async getConfigByHash(hashId: string): Promise<Config | undefined> {
    for (const config of this.configs.values()) {
      if (config.hashId === hashId) {
        return config;
      }
    }
    return undefined;
  }

  async createConfig(insertConfig: InsertConfig): Promise<Config> {
    const id = this.currentId++;
    const config: Config = { ...insertConfig, id };
    this.configs.set(id.toString(), config);
    return config;
  }

  async updateConfig(hashId: string, updatedConfig: InsertConfig): Promise<Config | undefined> {
    for (const [key, config] of this.configs.entries()) {
      if (config.hashId === hashId) {
        const updated: Config = { ...config, ...updatedConfig };
        this.configs.set(key, updated);
        return updated;
      }
    }
    return undefined;
  }

  async deleteConfig(hashId: string): Promise<boolean> {
    for (const [key, config] of this.configs.entries()) {
      if (config.hashId === hashId) {
        this.configs.delete(key);
        return true;
      }
    }
    return false;
  }
}

export const storage = new MemStorage();
