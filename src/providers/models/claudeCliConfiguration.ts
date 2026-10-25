import fs from 'node:fs';
import path from 'node:path';
import {ClaudeCliPlanner, type ClaudeCliPlannerConfiguration} from './claudeCliPlanner.js';

/** Host-selected configuration only; never discovers profiles or copies credentials. */
export function readClaudeCliPlannerConfiguration(file: string): ClaudeCliPlannerConfiguration {
  if (typeof file !== 'string' || !path.isAbsolute(file)) throw Error('Select an absolute Claude planner configuration file');
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 32768) throw Error('Claude planner configuration must be a regular file of at most 32 KiB');
  const config: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!config || typeof config !== 'object' || Array.isArray(config)
    || Object.keys(config).some(key => !['executablePath', 'configurationDirectory', 'model'].includes(key))) throw Error('Use only executablePath, configurationDirectory and model in Claude planner configuration');
  const value = config as ClaudeCliPlannerConfiguration;
  // Constructor validation is shared with direct SDK callers. No client runs here.
  new ClaudeCliPlanner(value);
  return {...value};
}
