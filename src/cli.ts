import { cli } from 'cleye';
import { red } from 'kolorist';
import { version } from '../package.json';
import config from './commands/config';
import update from './commands/update';
import chat from './commands/chat';
import { commandName } from './helpers/constants';
import { handleCliError } from './helpers/error';
import { prompt } from './prompt';
import { readFileInput, readFilePath, fileInputSize } from './helpers/file-input';

// capture file input
// @example cat image.png | ai describe this image
// @example cat big-prompt.txt | ai
// @todo ai cat some-binary-file.dat | analyse this file

(async () => {

  let fileInput = await readFileInput();

  const argv = cli(
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
        model: {
          type: String,
          description: 'Model to use.',
          alias: 'm',
        },
        safe: {
          type: Boolean,
          description: 'Enable safe mode to enable an Anthropic AI system prompt that instructs the agent to never generate commands that can potentially cause changes on the server.',
          alias: 'S',
        },
        system: {
          type: String,
          description: 'Custom system prompt. A file or text.',
          alias: 'X',
        },
        file: {
          type: String,
          description: 'File for prompt text or image.',
          alias: 'f',
        },
      },
      commands: [config, chat, update],
    },
    async (argv) => {
      const silentMode = argv.flags.silent;
      const instantMode = argv.flags.instant;
      const safeMode = argv.flags.safe;
      const systemPrompt = argv.flags.system;
      const selectedModel = argv.flags.model;
      const filePath = argv.flags.file;
      const promptText = argv._.join(' ');

      if (!fileInput && filePath) {
        fileInput = await readFilePath(filePath);
      }

      if (promptText.trim() === 'update') {
        update.callback?.(argv);
      } else {

        prompt({ usePrompt: promptText, silentMode, instantMode, safeMode, fileInput, systemPrompt, selectedModel }).catch((error) => {
          console.error(`\n${red('✖')} ${error.message}`);
          handleCliError(error);
          process.exit(1);
        });
      }
    }
  );
})();