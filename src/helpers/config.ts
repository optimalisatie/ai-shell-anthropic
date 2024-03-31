import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ini from 'ini';
import type { TiktokenModel } from '@dqbd/tiktoken';
import { commandName } from './constants';
import { KnownError, handleCliError } from './error';
import * as p from '@clack/prompts';
import { red } from 'kolorist';
import i18n from './i18n';
import { systemPrompts } from '../system-prompts';

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (object: unknown, key: PropertyKey) =>
  hasOwnProperty.call(object, key);

const languagesOptions = Object.entries(i18n.languages).map(([key, value]) => ({
  value: key,
  label: value,
}));

const parseAssert = (name: string, condition: any, message: string) => {
  if (!condition) {
    throw new KnownError(
      `${i18n.t('Invalid config property')} ${name}: ${message}`
    );
  }
};

const configParsers = {
  ANTHROPICAI_KEY(key?: string) {
    if (!key) {
      throw new KnownError(
        `Please set your AnthropicAI API key via \`${commandName} config set ANTHROPICAI_KEY=<your token>\`` // TODO: i18n
      );
    }

    return key;
  },
  MODEL(model?: string) {
    if (!model || model.length === 0) {
      return 'haiku';
    }

    return model as TiktokenModel;
  },
  SILENT_MODE(mode?: string) {
    return String(mode).toLowerCase() === 'true';
  },
  INSTANT_MODE(mode?: string) {
    return String(mode).toLowerCase() === 'true';
  },
  SAFE_MODE(mode?: string) {
    return String(mode).toLowerCase() === 'true';
  },
  LANGUAGE(language?: string) {
    return language || 'en';
  },
  SYSTEM_PROMPT_FILE(system_prompt_file?: string) {
    return system_prompt_file || false;
  },
} as const;

type ConfigKeys = keyof typeof configParsers;

type RawConfig = {
  [key in ConfigKeys]?: string;
};

type ValidConfig = {
  [Key in ConfigKeys]: ReturnType<(typeof configParsers)[Key]>;
};

const configPath = path.join(os.homedir(), '.ai-shell');

const fileExists = (filePath: string) =>
  fs.lstat(filePath).then(
    () => true,
    () => false
  );

const readConfigFile = async (): Promise<RawConfig> => {
  const configExists = await fileExists(configPath);
  if (!configExists) {
    return Object.create(null);
  }

  const configString = await fs.readFile(configPath, 'utf8');
  return ini.parse(configString);
};

export const getSystemPromptConfig = async (SYSTEM_PROMPT_FILE, customSystemPrompt) => {
  let systemPromptConfig = Object.assign({}, systemPrompts);

  // (chatMode) ? 'chat'
  // customized system prompts
  if (SYSTEM_PROMPT_FILE) {
    let customSystemPromptConfig = await readSystemPromptConfigFile(SYSTEM_PROMPT_FILE);

    if (customSystemPromptConfig && typeof customSystemPromptConfig === 'object') {
      systemPromptConfig = Object.assign(systemPromptConfig, customSystemPromptConfig)
    }
  }

  if (customSystemPrompt) {
    const isFile = await fileExists(customSystemPrompt);
    if (isFile) {
      systemPromptConfig.custom = await fs.readFile(customSystemPrompt, 'utf8');
    } else {
      systemPromptConfig.custom = customSystemPrompt;
    }
  }

  return systemPromptConfig;
};

let systemPromptConfigCache = new Map();
export const readSystemPromptConfigFile = async (system_prompt_file): Promise<RawConfig> => {
  
  if (systemPromptConfigCache.has(system_prompt_file)) {
    return systemPromptConfigCache.get(system_prompt_file);
  }

  const configExists = (system_prompt_file) ? await fileExists(system_prompt_file) : false;
  if (!configExists) {
    return Object.create(null);
  }

  let config;
  try {
    if (/\.js$/.test(system_prompt_file)) {
      config = require(path.resolve(system_prompt_file));
    } else {
      config = JSON.parse(await fs.readFile(system_prompt_file, 'utf8'));
    }
    if (!config || typeof config !== 'object') {
      throw new KnownError(`${i18n.t('Invalid JSON in system prompt file.')}: ${system_prompt_file}`);  
    }
  } catch(err) {
    throw new KnownError(`${i18n.t('Failed to parse JSON of system prompt file.')}: ${system_prompt_file} ${err}`);
    return false;
  }
  
  // Add the file path to the cache
  systemPromptConfigCache.set(system_prompt_file, config);

  return config;
};

export const getConfig = async (
  cliConfig?: RawConfig
): Promise<ValidConfig> => {
  const config = await readConfigFile();
  const parsedConfig: Record<string, unknown> = {};

  for (const key of Object.keys(configParsers) as ConfigKeys[]) {
    const parser = configParsers[key];
    const value = cliConfig?.[key] ?? config[key];
    parsedConfig[key] = parser(value);
  }

  return parsedConfig as ValidConfig;
};

export const setConfigs = async (keyValues: [key: string, value: string][]) => {
  const config = await readConfigFile();

  for (const [key, value] of keyValues) {
    if (!hasOwn(configParsers, key)) {
      throw new KnownError(`${i18n.t('Invalid config property')}: ${key}`);
    }

    const parsed = configParsers[key as ConfigKeys](value);
    config[key as ConfigKeys] = parsed as any;
  }

  await fs.writeFile(configPath, ini.stringify(config), 'utf8');
};

export const showConfigUI = async () => {
  try {
    const config = await getConfig();
    const choice = (await p.select({
      message: i18n.t('Set config') + ':',
      options: [
        {
          label: i18n.t('Anthropic API Key'),
          value: 'ANTHROPICAI_KEY',
          hint: hasOwn(config, 'ANTHROPICAI_KEY')
            ? // Obfuscate the key
              'sk-...' + config.ANTHROPICAI_KEY.slice(-3)
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Silent Mode'),
          value: 'SILENT_MODE',
          hint: hasOwn(config, 'SILENT_MODE')
            ? config.SILENT_MODE.toString()
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Instant Mode'),
          value: 'INSTANT_MODE',
          hint: hasOwn(config, 'INSTANT_MODE')
            ? config.INSTANT_MODE.toString()
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Safe Mode'),
          value: 'SAFE_MODE',
          hint: hasOwn(config, 'SAFE_MODE')
            ? config.SAFE_MODE.toString()
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Model'),
          value: 'MODEL',
          hint: hasOwn(config, 'MODEL') ? config.MODEL : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Language'),
          value: 'LANGUAGE',
          hint: hasOwn(config, 'LANGUAGE')
            ? config.LANGUAGE
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('System Prompt File'),
          value: 'SYSTEM_PROMPT_FILE',
          hint: hasOwn(config, 'SYSTEM_PROMPT_FILE')
            ? config.SYSTEM_PROMPT_FILE.toString()
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Cancel'),
          value: 'cancel',
          hint: i18n.t('Exit the program'),
        },
      ],
    })) as ConfigKeys | 'cancel' | symbol;

    if (p.isCancel(choice)) return;

    if (choice === 'ANTHROPICAI_KEY') {
      const key = await p.text({
        message: i18n.t('Enter your Anthropic API key'),
        validate: (value) => {
          if (!value.length) {
            return i18n.t('Please enter a key');
          }
        },
      });
      if (p.isCancel(key)) return;
      await setConfigs([['ANTHROPICAI_KEY', key]]);
    } else if (choice === 'SILENT_MODE') {
      const silentMode = await p.confirm({
        message: i18n.t('Enable silent mode?'),
      });
      if (p.isCancel(silentMode)) return;
      await setConfigs([['SILENT_MODE', silentMode ? 'true' : 'false']]);
    } else if (choice === 'INSTANT_MODE') {
      const instantMode = await p.confirm({
        message: i18n.t('Enable instant mode?\n⚠️ Warning: Enabling instant mode allows the AI-generated commands to be executed immediately without any further confirmation.\n'),
      });
      if (p.isCancel(instantMode)) return;
      await setConfigs([['INSTANT_MODE', instantMode ? 'true' : 'false']]);
    } else if (choice === 'SAFE_MODE') {
      const safeMode = await p.confirm({
        message: i18n.t('Enable safe mode?\nThis will enable an Anthropic AI system prompt that intstructs the shell agent to never generate commands that can potentially cause changes on the server.\n⚠️ Warning: Safety still depends on the reliability of AI.'),
      });
      if (p.isCancel(safeMode)) return;
      await setConfigs([['SAFE_MODE', safeMode ? 'true' : 'false']]);
    } else if (choice === 'SYSTEM_PROMPT_FILE') {
      const system_prompt_file = await p.text({
        message: i18n.t('Enter a custom JSON system prompt file with the optional fields: { shell: ...., shell_safe: ..., chat: ...'),
        initialValue: (config.SYSTEM_PROMPT_FILE) ? config.SYSTEM_PROMPT_FILE : '',
      });
      if (p.isCancel(system_prompt_file)) return;

      if (system_prompt_file && system_prompt_file.trim() !== '') {

      const systemPromptFileExists = await fileExists(system_prompt_file);
      if (!systemPromptFileExists) {
        throw new KnownError(
          `${i18n.t('System prompt file does not exist or is not accessible:')} ${system_prompt_file}`
        );
      }
    }

      await setConfigs([['SYSTEM_PROMPT_FILE', system_prompt_file]]);
    } else if (choice === 'MODEL') {
      const model = await p.text({
        message: i18n.t('Enter the model you want to use'),
        initialValue: (config.MODEL) ? config.MODEL : '',
      });
      if (p.isCancel(model)) return;
      await setConfigs([['MODEL', model]]);
    } else if (choice === 'LANGUAGE') {
      const language = (await p.select({
        message: i18n.t('Enter the language you want to use'),
        options: languagesOptions,
      })) as string;
      if (p.isCancel(language)) return;
      await setConfigs([['LANGUAGE', language]]);
      i18n.setLanguage(language);
    }
    if (choice === 'cancel') return;
    showConfigUI();
  } catch (error: any) {
    console.error(`\n${red('✖')} ${error.message}`);
    handleCliError(error);
    process.exit(1);
  }
};
