import { cli } from 'cleye';
import { red } from 'kolorist';
import { version } from '../package.json';
import config from './commands/config';
import update from './commands/update';
import chat from './commands/chat';
import { commandName } from './helpers/constants';
import { handleCliError } from './helpers/error';
import { prompt } from './prompt';

cli(
  {
    name: commandName,
    version: version,
    flags: {
      prompt: {
        type: String,
        description: 'Prompt to run',
        alias: 'p',
      },
      silent: {
        type: Boolean,
        description: 'Skip printing the command explanation',
        alias: 's',
      },
      instant: {
        type: Boolean,
        description: 'Instantly execute generated commands',
        alias: 'i',
      },
      safe: {
        type: Boolean,
        description: 'Enable safe mode to enable an Anthropic AI system prompt that instructs the agent to never generate commands that can potentially cause changes on the server.',
        alias: 'S',
      },
    },
    commands: [config, chat, update],
  },
  (argv) => {
    const silentMode = argv.flags.silent;
    const instantMode = argv.flags.instant;
    const safeMode = argv.flags.safe;
    const promptText = argv._.join(' ');

    if (promptText.trim() === 'update') {
      update.callback?.(argv);
    } else {
      prompt({ usePrompt: promptText, silentMode, instantMode, safeMode }).catch((error) => {
        console.error(`\n${red('✖')} ${error.message}`);
        handleCliError(error);
        process.exit(1);
      });
    }
  }
);
