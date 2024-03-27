<h2 align="center">
   <img width="300" alt="Anthropic logo" src="./anthropic-logo.png">
</h2>

<h4 align="center">
   A CLI that converts natural language to shell commands. 
</h4>

A port of OpenAI based [@BuilderIO/ai-shell](https://github.com/BuilderIO/ai-shell) to Anthropic AI using [anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript).

### Advantages
- The Haiku model is low cost and super fast (see [#models](#custom-anthropic-model))
- Anthropic AI is reliable and precise in its responses.
- Opus model available on par with GPT-4 and Gemini.
- Improved with features such as instant mode, reading prompt files and image analyzation.

<p align="center">
   <a href="https://www.npmjs.com/package/@optimization/ai-shell-anthropic"><img src="https://img.shields.io/npm/v/@optimization/ai-shell-anthropic" alt="Current version"></a>
</p>

<p align="center">
   <img alt="Gif Demo" src="https://user-images.githubusercontent.com/844291/230413167-773845e7-4c9f-44a5-909c-02802b5e49f6.gif" >
<p>

<p align="center">
   Inspired by the <a href="https://githubnext.com/projects/copilot-cli">GitHub Copilot X CLI</a>, but open source for everyone.
</p>

<br>

# AI Shell Anthropic

## Setup

> The minimum supported version of Node.js is v14

1. Install _ai shell anthropic_:

   ```sh
   npm install -g @optimization/ai-shell-anthropic
   ```

2. Retrieve your API key from [https://console.anthropic.com/](Anthropic)

   > Note: If you haven't already, you'll have to create an account.

3. Set the key so ai-shell-anthropic can use it:

   ```sh
   ai config set ANTHROPICAI_KEY=<your token>
   ```

   This will create a `.ai-shell` file in your home directory.

## Usage

```bash
ai <prompt>
```

For example:

```bash
ai list all log files
```

Then you will get an output like this, where you can choose to run the suggested command, revise the command via a prompt, or cancel:

```bash
◇  Your script:
│
│  find . -name "*.log"
│
◇  Explanation:
│
│  1. Searches for all files with the extension ".log" in the current directory and any subdirectories.
│
◆  Run this script?
│  ● ✅ Yes (Lets go!)
│  ○ 📝 Revise
│  ○ ❌ Cancel
└
```

### Special characters

Note that some shells handle certain characters like the `?` or `*` or things that look like file paths specially. If you are getting strange behaviors, you can wrap the prompt in quotes to avoid issues, like below:

```bash
ai 'what is my ip address'
```

### Chat mode

![Chat demo](https://user-images.githubusercontent.com/844291/232889699-e13fb3fe-1659-4583-80ee-6c58d1bcbd06.gif)

```bash
ai chat
```

With this mode, you can engage in a conversation with the AI and receive helpful responses in a natural, conversational manner directly through the CLI:

```sh
┌  Starting new conversation
│
◇  You:
│  how do I serve a redirect in express
│
◇  AI Shell:

In Express, you can use the `redirect()` method to serve a redirect. The `redirect()` method takes one argument, which is the URL that you want to redirect to.

Here's an example:

\`\`\`js
app.get('/oldurl', (req, res) => {
  res.redirect('/newurl');
});
\`\`\`
```

### Silent Mode (Skip Explanations)

You can disable and skip the explanation section by using the flag `-s` or `--silent`

```bash
ai -s list all log files
```

Alternatively, you can save the option as a preference using this command:

```bash
ai config set SILENT_MODE=true
```

### Instant Mode (Execute Instantly)

When you trust the output of Anthropic AI for your requested commands, you can enable instant execution of the generated commands by using the flag `-i` or `--instant`:

```bash
ai -i "show files modified yesterday"
```

Alternatively, you can save the option as a preference using this command:

```bash
ai config set INSTANT_MODE=true
```

⚠️ **Warning:** Enabling instant mode allows the AI-generated commands to be executed immediately without any further confirmation. This can be potentially dangerous. Use this feature with caution and only when you fully trust the AI's output for your specific use case. Make sure to review and test the generated commands in a safe environment before relying on instant mode for critical tasks or sensitive data. 

Remember, while AI assistants like Anthropic AI can be incredibly helpful, they are not infallible. It's always your responsibility to ensure the safety and reliability of the commands you execute on your system.

# Custom Anthropic Model

Anthropic offers a range of powerful language models that can be used to generate shell scripts and commands. You can select the Anthropic model that best suits your needs, either via the short hands `opus`, `sonnet`, and `haiku`, or by using a specific model version reference, e.g., `claude-3-haiku-20240307`. The default model is `haiku`.

To set the desired model, use the following command:

```sh
ai config set MODEL=opus
```

Here's a list of the advantages of each Anthropic model for the shell AI tool:

**Opus:**
- Largest model with the most extensive knowledge base
- Excels at complex and technical tasks, such as writing advanced shell scripts and analyzing system configurations
- Provides the most detailed and comprehensive explanations for generated commands
- Ideal for users who require the highest level of accuracy and thoroughness in their shell AI assistant

**Sonnet:**
- Well-balanced model that offers a good compromise between performance and efficiency
- Generates concise and effective shell commands while still providing sufficient context and explanations
- Suitable for a wide range of shell-related tasks, from basic file management to system administration
- Recommended for users who want a versatile and reliable shell AI assistant without the extra computational overhead of the largest model

**Haiku:**
- Smallest and most efficient model, offering quick response times and lower resource consumption
- Generates succinct and to-the-point shell commands, perfect for users who prefer a streamlined and minimalist approach
- Focuses on the essential aspects of the task at hand, without providing extensive explanations or context
- Best suited for users who prioritize speed and simplicity in their shell AI assistant, and are comfortable with a more concise output style

# Passing File Data to AI Shell

The AI shell tool now supports passing file data, such as text prompts and images, directly to the AI assistant.

## Passing Text Prompts

To pass a text prompt from a file to the AI shell tool, you can use the `cat` command followed by the file name and pipe the output to `ai`. Here's an example:

```bash
cat big-prompt.txt | ai
```

In this example, the contents of the file `big-prompt.txt` will be passed as input to the AI shell tool. The AI assistant will process the text prompt and generate a response based on the provided context.

This feature is particularly useful when you have a large or complex prompt that is easier to manage in a separate file. It allows you to keep your prompts organized and easily reusable.

## Passing Images
The AI shell tool also supports passing image data for analysis and description. To pass an image file to the AI, you can use the `cat` command followed by the image file name and pipe the output to `ai describe this image`. Here's an example:

```bash
cat image.png | ai describe this image
```

In this example, the contents of the image file `image.png` will be passed as input to the AI shell tool. The AI assistant will analyze the image and generate a description based on its visual content.

This feature enables you to leverage Anthropic AI's image recognition capabilities directly from the command line. You can use it to quickly describe images, extract relevant information, or generate captions for your visual data.

# Customizing System Prompts

Anthropic AI offers a unique feature that allows users to customize the system prompts for the AI shell assistant. By modifying the system prompts, you can fine-tune the AI's behavior and responses to achieve a personalized and efficient shell agent tailored to your specific needs.

The default system prompts are located in the repository directory [./src/system-prompts.ts](./src/system-prompts.ts). This file contains three system prompts:

1. `shell`: The system prompt for generating shell commands.
2. `shell_safe`: The system prompt for generating shell commands when safe mode is enabled.
3. `chat`: The system prompt for general chat mode.

By customizing these system prompts, you can unlock unique capabilities for the AI shell assistant. Here are some examples:

- Customize the `shell` prompt to prioritize specific aspects like performance, readability, or compatibility. You can also add context about your environment, such as the operating system or preferred shell, to generate more targeted commands.

- Modify the `shell_safe` prompt to enhance security by specifying additional checks, defining stricter rules for safe commands, and providing examples of harmful commands to avoid. This allows you to create a highly secure AI shell assistant that adheres to your organization's security guidelines.

- Tailor the `chat` prompt to achieve advanced general-purpose AI agents accessible from the shell CLI. You can customize the AI's personality, tone, or communication style, specify areas of expertise, encourage clarifying questions, and define ethical guidelines for the conversation.

Customizing the system prompts is a powerful way to leverage Anthropic AI's capabilities and create a highly personalized AI shell assistant. By modifying the prompts, you can adapt the AI's behavior to suit your specific requirements, whether it's generating optimized shell commands, enhancing security, or providing intelligent conversation.

To customize the system prompts, follow these steps:

1. Create a new JSON file with your custom system prompts.
2. Set the path to your custom system prompts JSON file using one of the following methods:

Access the configuration UI menu by running:

```sh
ai config
```

Navigate to the "System Prompt File" option and provide the path to your custom system prompts JSON file.

Alternatively, you can set the option directly using the following command:

```sh
ai config set SYSTEM_PROMPT_FILE=/path/to/system-prompts.json
```

Once you have set the path to your custom system prompts file, the AI shell assistant will use the specified prompts for generating commands and responses.

### Set Language

![Language UI](https://user-images.githubusercontent.com/1784873/235330029-0a3b394c-d797-41d6-8717-9a6b487f1ae8.gif)

The AI Shell's default language is English, but you can easily switch to your preferred language by using the corresponding language keys, as shown below:

| Language            | Key     |
| ------------------- | ------- |
| English             | en      |
| Simplified Chinese  | zh-Hans |
| Traditional Chinese | zh-Hant |
| Spanish             | es      |
| Japanese            | jp      |
| Korean              | ko      |
| French              | fr      |
| German              | de      |
| Italian             | it      |
| Dutch               | nl      |
| Greek               | gr      |
| Russian             | ru      |
| Ukrainian           | uk      |
| Vietnamese          | vi      |
| Arabic              | ar      |
| Portuguese          | pt      |
| Turkish             | tr      |

For instance, if you want to switch to Greek, you can do so by setting the LANGUAGE value to gr:

```sh
ai config set LANGUAGE=gr
```

This will set your language to Greek.

### Config UI

To use a more visual interface to view and set config options you can type:

```bash
ai config
```

To get an interactive UI like below:

```bash
◆  Set config:
│  ○ AnthropicAI Key
│  ○ Silent Mode
│  ○ Instant Mode
│  ○ Safe Mode
│  ● Model (opus, sonnet or haiku, or a model version name, e.g. claude-3-haiku-20240307)
│  ○ Language
│  ○ System Prompt File
│  ○ Cancel
└
```

### Upgrading

Check the installed version with:

```bash
ai --version
```

If it's not the [latest version](https://github.com/optimalisatie/ai-shell-anthropic/tags), run:

```bash
npm update -g @optimization/ai-shell-anthropic
```

Or just use AI shell:

```bash
ai update
```

## Common Issues

## Motivation

Original author [BuilderIO](https://github.com/BuilderIO/ai-shell):

> I am not a bash wizard, and am dying for access to the copilot CLI, and got impatient.

AnthropicAI: 

> The original ai-shell script, created by [BuilderIO](https://github.com/BuilderIO), demonstrated the power of integrating OpenAI's language model into a command-line tool for generating and explaining shell commands. However, with the emergence of Anthropic AI and their advanced language models like Claude, there was an opportunity to explore the capabilities of Anthropic AI in the context of an AI-powered shell assistant.
> 
> This port of ai-shell to Anthropic AI aims to leverage the strengths of Anthropic's language models, such as their focus on safety, transparency, and alignment with human values. By integrating Anthropic AI into the script, we can benefit from their state-of-the-art natural language processing capabilities while ensuring responsible and ethical AI assistance.

## Contributing

If you want to help fix a bug or implement a feature in [Issues](https://github.com/optimalisatie/ai-shell-anthropic/issues) (tip: look out for the `help wanted` label), checkout the [Contribution Guide](CONTRIBUTING.md) to learn how to setup the project.

## Credit

- Thanks to GitHub Copilot for their amazing tools and the idea for this
- Thanks to Hassan and his work on [aicommits](https://github.com/Nutlope/aicommits) which inspired the workflow and some parts of the code and flows

## Community

Come join the [Builder.io discord](https://discord.gg/EMx6e58xnw) and chat with us in the #ai-shell room (OpenAI version).

<br><br>
Original author:
<p align="center">
   <a href="https://www.builder.io/m/developers">
      <picture>
         <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/844291/230786554-eb225eeb-2f6b-4286-b8c2-535b1131744a.png">
         <img width="250" alt="Made with love by Builder.io" src="https://user-images.githubusercontent.com/844291/230786555-a58479e4-75f3-4222-a6eb-74c5af953eac.png">
       </picture>
   </a>
</p>