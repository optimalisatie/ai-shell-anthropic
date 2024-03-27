import * as p from '@clack/prompts';
import { execaCommand } from 'execa';
import { cyan, green, red, dim } from 'kolorist';
import {
  getExplanation,
  getRevision,
  getScriptAndInfo,
} from './helpers/completion';
import { getConfig, getSystemPromptConfig } from './helpers/config';
import { projectName } from './helpers/constants';
import { KnownError } from './helpers/error';
import clipboardy from 'clipboardy';
import i18n from './helpers/i18n';
import { fromBuffer } from 'file-type';

const init = async () => {
  try {
    const { LANGUAGE: language } = await getConfig();
    i18n.setLanguage(language);
  } catch {
    i18n.setLanguage('en');
  }
};

const examples: string[] = [];
const initPromise = init();
initPromise.then(() => {
  examples.push(i18n.t('list js files'));
  examples.push(i18n.t('list all commits'));
});

const sample = <T>(arr: T[]): T | undefined => {
  const len = arr == null ? 0 : arr.length;
  return len ? arr[Math.floor(Math.random() * len)] : undefined;
};

async function runScript(script: string, silent: boolean) {
  if (!silent) {
    p.outro(`${i18n.t('Running')}: ${script}`);
    console.log('');
  }
  await execaCommand(script, {
    stdio: 'inherit',
    shell: process.env.SHELL || true,
  }).catch(() => {
    // Nothing needed, it'll output to stderr
  });
}

async function getPrompt(prompt?: string) {
  await initPromise;
  const group = p.group(
    {
      prompt: () =>
        p.text({
          message: i18n.t('What would you like me to do?'),
          placeholder: `${i18n.t('e.g.')} ${sample(examples)}`,
          initialValue: prompt,
          multiline: true, // Enable multiline mode
          defaultValue: i18n.t('Say hello'),
          validate: (value) => {
            if (!value) return i18n.t('Please enter a prompt.');
          },
        }),
    },
    {
      onCancel: () => {
        p.cancel(i18n.t('Goodbye!'));
        process.exit(0);
      },
    }
  );
  return (await group).prompt;
}

async function promptForRevision() {
  const group = p.group(
    {
      prompt: () =>
        p.text({
          message: i18n.t('What would you like me to change in this script?'),
          placeholder: i18n.t('e.g. change the folder name'),
          validate: (value) => {
            if (!value) return i18n.t('Please enter a prompt.');
          },
        }),
    },
    {
      onCancel: () => {
        p.cancel(i18n.t('Goodbye!'));
        process.exit(0);
      },
    }
  );
  return (await group).prompt;
}

export async function prompt({
  usePrompt,
  silentMode,
  instantMode,
  safeMode,
  fileInput,
}: { usePrompt?: string; silentMode?: boolean } = {}) {
  const {
    ANTHROPICAI_KEY: key,
    SILENT_MODE,
    INSTANT_MODE,
    SAFE_MODE,
    MODEL: model,
    SYSTEM_PROMPT_FILE,
  } = await getConfig();
  const skipCommandExplanation = silentMode || SILENT_MODE;
  const instantModeEnabled = instantMode || INSTANT_MODE;
  const safeModeEnabled = safeMode || SAFE_MODE;

  let systemPromptConfig = await getSystemPromptConfig(SYSTEM_PROMPT_FILE);

  console.log('');

  let modeName = [];
  if (instantModeEnabled) {
    modeName.push(`⚠️ ${red(`Instant Mode`)}`);
  }
  if (safeModeEnabled) {
    modeName.push(`🛡️ ${green(`Safe Mode`)}`);
  }
  modeName = (modeName.length) ? ' | ' + modeName.join(' | ') : '';

  p.intro(
    `${cyan(`${projectName}`)}${modeName}`
  );

  let thePrompt
  if (fileInput && fileInput.text) {
    thePrompt = fileInput.data + '\n\n' + ((usePrompt) ? usePrompt : '');
    fileInput = false;
  } else {
    thePrompt = usePrompt || (await getPrompt());
  }

  if (safeModeEnabled) {
    thePrompt += (systemPromptConfig.safe_mode_enforcer) ? systemPromptConfig.safe_mode_enforcer : '';
  }

  const spin = p.spinner();
  spin.start(i18n.t(`Loading...`));

  const { readInfo, readScript } = await getScriptAndInfo({
    prompt: thePrompt,
    key,
    model,
    safeModeEnabled,
    systemPromptConfig,
    fileInput,
  });

  const script = await readScript(process.stdout.write.bind(process.stdout));

  let safeModeWarning;
  if (/safe_mode_prohibited/i.test(script)) {
    
    try {
      safeModeWarning = JSON.parse(script);
    } catch(err) {
      safeModeWarning = {
        explanation: script,
        unsafe_command: 'null'
      }
    };
    let explanation = safeModeWarning.explanation || '';
    let unsafe_command = safeModeWarning.unsafe_command || 'null';

    spin.stop(`⚠️ ${red(`${i18n.t('Safe Mode Blocked Script')}`)}`);

    console.log('│');
    console.log(dim('•'), `${i18n.t('Script')}: ${unsafe_command}`);
    p.outro(`${explanation}`);
    process.exit(0);

  } else if (fileInput) {

    console.log('│');
    p.outro(`${script}`);
    process.exit(0);

  } else if (!instantModeEnabled) {
    spin.stop(`${i18n.t('Your script')}: ${script}`);
  } else {
    spin.stop(`${i18n.t('Executing script')}: ${script}`);
    console.log('');
  }
  if (instantModeEnabled) {
    try {
      await runScript(script, true);
    } catch (err) { 
      console.error('error executing script', err);
    }
    process.exit(1);
  } else {

    console.log('│');
    console.log(dim('•'));

    if (!skipCommandExplanation) {
      spin.start(i18n.t(`Getting explanation...`));
      const info = await readInfo(process.stdout.write.bind(process.stdout));
      if (!info) {
        const { readExplanation } = await getExplanation({
          script,
          key,
        });
        spin.stop(`${i18n.t('Explanation')}:`);
        console.log('');
        await readExplanation(process.stdout.write.bind(process.stdout));
        console.log('');
        console.log('');
        console.log(dim('•'));
      }
    }

    await runOrReviseFlow(script, key, model, silentMode);
  }
}

async function runOrReviseFlow(
  script: string,
  key: string,
  model: string,
  silentMode?: boolean
) {
  const emptyScript = script.trim() === '';

  const answer: symbol | (() => any) = await p.select({
    message: emptyScript
      ? i18n.t('Revise this script?')
      : i18n.t('Run this script?'),
    options: [
      ...(emptyScript
        ? []
        : [
            {
              label: '✅ ' + i18n.t('Yes'),
              hint: i18n.t('Lets go!'),
              value: async () => {
                await runScript(script);
              },
            },
            {
              label: '📝 ' + i18n.t('Edit'),
              hint: i18n.t('Make some adjustments before running'),
              value: async () => {
                const newScript = await p.text({
                  message: i18n.t('you can edit script here:'),
                  initialValue: script,
                });
                if (!p.isCancel(newScript)) {
                  await runScript(newScript);
                }
              },
            },
          ]),
      {
        label: '🔁 ' + i18n.t('Revise'),
        hint: i18n.t('Give feedback via prompt and get a new result'),
        value: async () => {
          await revisionFlow(script, key, model, silentMode);
        },
      },
      {
        label: '📋 ' + i18n.t('Copy'),
        hint: i18n.t('Copy the generated script to your clipboard'),
        value: async () => {
          await clipboardy.write(script);
          p.outro(i18n.t('Copied to clipboard!'));
        },
      },
      {
        label: '❌ ' + i18n.t('Cancel'),
        hint: i18n.t('Exit the program'),
        value: () => {
          p.cancel(i18n.t('Goodbye!'));
          process.exit(0);
        },
      },
    ],
  });

  if (typeof answer === 'function') {
    await answer();
  }
}

async function revisionFlow(
  currentScript: string,
  key: string,
  model: string,
  silentMode?: boolean
) {
  const revision = await promptForRevision();
  const spin = p.spinner();
  spin.start(i18n.t(`Loading...`));
  const { readScript } = await getRevision({
    prompt: revision,
    code: currentScript,
    key,
    model,
  });
  spin.stop(`${i18n.t(`Your new script`)}:`);

  console.log('');
  const script = await readScript(process.stdout.write.bind(process.stdout));
  console.log('');
  console.log('');
  console.log(dim('•'));

  if (!silentMode) {
    const infoSpin = p.spinner();
    infoSpin.start(i18n.t(`Getting explanation...`));
    const { readExplanation } = await getExplanation({
      script,
      key,
      model,
    });

    infoSpin.stop(`${i18n.t('Explanation')}:`);
    console.log('');
    await readExplanation(process.stdout.write.bind(process.stdout));
    console.log('');
    console.log('');
    console.log(dim('•'));
  }

  await runOrReviseFlow(script, key, model, silentMode);
}

export const parseAssert = (name: string, condition: any, message: string) => {
  if (!condition) {
    throw new KnownError(
      `${i18n.t('Invalid config property')} ${name}: ${message}`
    );
  }
};
