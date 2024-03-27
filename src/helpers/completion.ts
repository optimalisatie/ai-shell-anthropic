import Anthropic from '@anthropic-ai/sdk';
import dedent from 'dedent';
import { KnownError } from './error';
import { detectShell } from './os-detect';
import './replace-all-polyfill';
import i18n from './i18n';
import { stripRegexPatterns } from './strip-regex-patterns';
import readline from 'readline';

// Define the available Anthropic models
const models = {
  opus: 'claude-3-opus-20240229',
  sonnet: 'claude-3-sonnet-20240229',
  haiku: 'claude-3-haiku-20240307',
};

const explainInSecondRequest = true;

// Create an Anthropic client instance with the provided API key
function getAnthropicClient(key: string) {
  return new Anthropic({ 
    apiKey: key
  });
}

// Get the Anthropic model based on the provided model name or default to 'haiku'
function getAnthropicModel(model?: string) {
  return model && models[model] ? models[model] : models['haiku'];
}

// Anthropic outputs markdown format for code blocks. It often uses
// a GitHub style like: "```bash"
const shellCodeExclusions = [/```[a-zA-Z]*\n/gi, /```[a-zA-Z]*/gi, '\n'];

// Generate a script and additional information based on the provided prompt
export async function getScriptAndInfo({
  prompt,
  key,
  model,
  safeModeEnabled,
  systemPromptConfig,
  fileInput,
}: {
  prompt: string;
  key: string;
  model?: string;
}) {
  let fullPrompt;
  if (fileInput) {
    fullPrompt = getImagePrompt(prompt);
  } else {
    fullPrompt = getFullPrompt(prompt);
  }

  const stream = await generateCompletion({
    prompt: fullPrompt,
    number: 1,
    key,
    model,
    safeModeEnabled,
    systemPromptConfig,
    fileInput,
  });
  return {
    readScript: readData(stream, ...shellCodeExclusions),
    readInfo: readData(stream, ...shellCodeExclusions),
  };
}

// Generate a completion using the Anthropic API
export async function generateCompletion({
  prompt,
  number = 1,
  key,
  model,
  chatMode,
  safeModeEnabled,
  systemPromptConfig,
  fileInput,
}: {
  prompt: string | { role: string; content: string }[];
  number?: number;
  model?: string;
  key: string;
  chatMode?: boolean;
}) {
  const selectedModel = getAnthropicModel(model);
  const anthropic = getAnthropicClient(key);
  const systemPrompt = (systemPromptConfig) ? systemPromptConfig[(chatMode) ? 'chat' : ((safeModeEnabled) ? 'shell_safe' : 'shell')] : '';

  try {

    let msgs = [];

    if (Array.isArray(prompt)) {
      msgs = msgs.concat(prompt);
    } else {
      msgs.push({ role: 'user', content: prompt });
    }

    if (fileInput && fileInput.image) {
      if (!Array.isArray(msgs[msgs.length - 1].content)) {
        if (typeof msgs[msgs.length - 1].content === 'string') {
          msgs[msgs.length - 1].content = {
            "type": "text",
            "text": msgs[msgs.length - 1].content
          }
        }
        msgs[msgs.length - 1].content = [msgs[msgs.length - 1].content];
      } 
      msgs[msgs.length - 1].content.unshift({"type": "image", "source": {
              "type": "base64",
              "media_type": fileInput.type.mime,
              "data": fileInput.data.toString('base64')
          }});
    }

    return anthropic.messages.stream({
      model: selectedModel,
      messages: msgs,
      max_tokens: 4096,
      stream: true,
      system: systemPrompt
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new KnownError(
        dedent`
        Anthropic API error ${err.status} ${err.name}
        Headers: ${JSON.stringify(err.headers, null, 2)}
        Message: ${err.message}
      `
      );
    } else {
      throw new KnownError(err.toString());
    }
  }
}

// Get an explanation for the provided script
export async function getExplanation({
  script,
  key,
  model,
}: {
  script: string;
  key: string;
  model?: string;
}) {
  const selectedModel = getAnthropicModel(model);
  const prompt = getExplanationPrompt(script);
  const stream = await generateCompletion({
    prompt,
    key,
    number: 1,
    model: selectedModel,
  });
  return { readExplanation: readData(stream) };
}

// Get a revised script based on the provided prompt and code
export async function getRevision({
  prompt,
  code,
  key,
  model,
}: {
  prompt: string;
  code: string;
  key: string;
  model?: string;
}) {
  const selectedModel = getAnthropicModel(model);
  const fullPrompt = getRevisionPrompt(prompt, code);
  const stream = await generateCompletion({
    prompt: fullPrompt,
    key,
    number: 1,
    model: selectedModel,
  });
  return {
    readScript: readData(stream, ...shellCodeExclusions),
  };
}

// Read data from the Anthropic message stream
export const readData =
  (
    stream: AsyncIterable<Anthropic.MessageStreamEvent>,
    ...excluded: (RegExp | string | undefined)[]
  ) =>
  async (writer: (data: string) => void): Promise<string> => {
    let stopTextStream = false;
    let data = '';
    let content = '';

    const stopTextStreamKeys = ['q', 'escape']; // Group of keys that stop the text stream
    const rl = readline.createInterface({
      input: process.stdin,
    });

    // Check if the stream is valid
    if (!stream || typeof stream !== 'object' || typeof stream.messages === 'undefined' || stream.messages === false) {
      return '';
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);

      process.stdin.on('keypress', (key, data) => {
        if (stopTextStreamKeys.includes(data.name)) {
          stopTextStream = true;
        }
      });
    }

    for await (const messageStreamEvent of stream) {
      if (messageStreamEvent.type === 'content_block_delta' || messageStreamEvent.type === 'content_block_start') {
        const payload = messageStreamEvent.content_block || messageStreamEvent.delta;
        if (!payload) {
          // @todo: handle this case if needed
          continue;
        }
        if (stopTextStream) {
          stream.messages = false;
          return data;
        }
        if (payload.type === 'text_delta') {
          content = payload.text;
        } else {
          // @todo: handle other payload types if needed
          continue;
        }

        if (content) {
          const contentWithoutExcluded = stripRegexPatterns(content, excluded);
          data += contentWithoutExcluded;
          writer(contentWithoutExcluded);
        }
      } else if (messageStreamEvent.type === 'message_stop') {
        stream.messages = false;
        return data;
      }
    }
    return data;
  };

// Get the explanation prompt for the provided script
function getExplanationPrompt(script: string) {
  return dedent`
    ${explainScript} Please reply in ${i18n.getCurrentLanguagenName()}
    The script: ${script}
  `;
}

// Get the details of the target shell
function getShellDetails() {
  const shellDetails = detectShell();
  return dedent`
      The shell and OS environment related to the prompt is ${shellDetails}
  `;
}

const shellDetails = getShellDetails();

const explainScript = dedent`
  Please provide a clear, concise description of the script, using minimal words. Outline the steps in a list format.
`;

// Get the details of the operating system
function getOperationSystemDetails() {
  const os = require('@nexssp/os/legacy');
  return os.name();
}

const generationDetails = dedent`
    Only reply with the single line command. It must be able to be directly run in the target shell. Do not include any other text.
    Make sure the command runs on ${getOperationSystemDetails()} operating system.
  `;

// Get the full prompt for generating a script
function getFullPrompt(prompt: string) {
  return dedent`
    Create a single line command that one can enter in a terminal and run, based on what is specified in the prompt.
    ${shellDetails}
    ${generationDetails}
    ${explainInSecondRequest ? '' : explainScript}
    The prompt is: ${prompt}
  `;
}

// Get the full prompt for generating a script
function getImagePrompt(prompt: string) {
  return dedent`
    Attached is an image. Answer the prompt relative to that image.
    ${shellDetails}
    ${explainInSecondRequest ? '' : explainScript}
    Remember, the prompt is about the attached image.
    The prompt is: ${prompt}
  `;
}

// Get the prompt for revising a script
function getRevisionPrompt(prompt: string, code: string) {
  return dedent`
    Update the following script based on what is asked in the following prompt.
    The script: ${code}
    The prompt: ${prompt}
    ${generationDetails}
  `;
}