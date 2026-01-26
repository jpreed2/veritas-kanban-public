import fs from 'fs/promises';
import path from 'path';
import { simpleGit } from 'simple-git';
import type { AppConfig, RepoConfig, AgentConfig, AgentType } from '@veritas-kanban/shared';

// Default paths - resolve to project root
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const CONFIG_DIR = path.join(PROJECT_ROOT, '.veritas-kanban');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  repos: [],
  agents: [
    {
      type: 'claude-code',
      name: 'Claude Code',
      command: 'claude',
      args: ['--dangerously-skip-permissions'],
      enabled: true,
    },
    {
      type: 'amp',
      name: 'Amp',
      command: 'amp',
      args: ['--dangerously-allow-all'],
      enabled: true,
    },
    {
      type: 'copilot',
      name: 'GitHub Copilot',
      command: 'copilot',
      args: ['-p'],
      enabled: false,
    },
    {
      type: 'gemini',
      name: 'Gemini CLI',
      command: 'gemini',
      args: [],
      enabled: false,
    },
  ],
  defaultAgent: 'claude-code',
};

export interface ConfigServiceOptions {
  configDir?: string;
  configFile?: string;
}

export class ConfigService {
  private configDir: string;
  private configFile: string;
  private config: AppConfig | null = null;

  constructor(options: ConfigServiceOptions = {}) {
    this.configDir = options.configDir || CONFIG_DIR;
    this.configFile = options.configFile || CONFIG_FILE;
  }

  private async ensureConfigDir(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
  }

  async getConfig(): Promise<AppConfig> {
    if (this.config) return this.config;

    await this.ensureConfigDir();

    try {
      const content = await fs.readFile(this.configFile, 'utf-8');
      this.config = JSON.parse(content);
      return this.config!;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Create default config
        await this.saveConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      }
      throw error;
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    await this.ensureConfigDir();
    await fs.writeFile(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
    this.config = config;
  }

  async addRepo(repo: RepoConfig): Promise<AppConfig> {
    const config = await this.getConfig();
    
    // Validate repo doesn't already exist
    if (config.repos.some(r => r.name === repo.name)) {
      throw new Error(`Repo "${repo.name}" already exists`);
    }

    // Validate path exists and is a git repo
    await this.validateRepoPath(repo.path);

    config.repos.push(repo);
    await this.saveConfig(config);
    return config;
  }

  async updateRepo(name: string, updates: Partial<RepoConfig>): Promise<AppConfig> {
    const config = await this.getConfig();
    const index = config.repos.findIndex(r => r.name === name);
    
    if (index === -1) {
      throw new Error(`Repo "${name}" not found`);
    }

    // If path is being updated, validate it
    if (updates.path) {
      await this.validateRepoPath(updates.path);
    }

    config.repos[index] = { ...config.repos[index], ...updates };
    await this.saveConfig(config);
    return config;
  }

  async removeRepo(name: string): Promise<AppConfig> {
    const config = await this.getConfig();
    const index = config.repos.findIndex(r => r.name === name);
    
    if (index === -1) {
      throw new Error(`Repo "${name}" not found`);
    }

    config.repos.splice(index, 1);
    await this.saveConfig(config);
    return config;
  }

  async validateRepoPath(repoPath: string): Promise<{ valid: boolean; branches: string[] }> {
    // Expand ~ to home directory
    const expandedPath = repoPath.replace(/^~/, process.env.HOME || '');
    
    try {
      await fs.access(expandedPath);
    } catch {
      throw new Error(`Path does not exist: ${repoPath}`);
    }

    try {
      const git = simpleGit(expandedPath);
      const isRepo = await git.checkIsRepo();
      
      if (!isRepo) {
        throw new Error(`Path is not a git repository: ${repoPath}`);
      }

      // Get branches
      const branchSummary = await git.branchLocal();
      const branches = branchSummary.all;

      return { valid: true, branches };
    } catch (error: any) {
      if (error.message.includes('not a git repository')) {
        throw new Error(`Path is not a git repository: ${repoPath}`);
      }
      throw error;
    }
  }

  async getRepoBranches(repoName: string): Promise<string[]> {
    const config = await this.getConfig();
    const repo = config.repos.find(r => r.name === repoName);
    
    if (!repo) {
      throw new Error(`Repo "${repoName}" not found`);
    }

    const expandedPath = repo.path.replace(/^~/, process.env.HOME || '');
    const git = simpleGit(expandedPath);
    const branchSummary = await git.branchLocal();
    
    return branchSummary.all;
  }

  async updateAgents(agents: AgentConfig[]): Promise<AppConfig> {
    const config = await this.getConfig();
    config.agents = agents;
    await this.saveConfig(config);
    return config;
  }

  async setDefaultAgent(agentType: AgentType): Promise<AppConfig> {
    const config = await this.getConfig();
    config.defaultAgent = agentType;
    await this.saveConfig(config);
    return config;
  }
}
