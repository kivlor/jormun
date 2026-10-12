#!/usr/bin/env node

/**
 * Jormun - The Last Harness
 *
 * Minimal agent harness: one LLM request, one round of eval.
 * The agent bootstraps by redefining `agent` into a real loop.
 *
 * Usage: node jormun.mjs "your task here"
 *
 * Requires: OPENAI_API_KEY or OPENAI_BASE_URL + API key in env
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const thisFile = fs.readFileSync(import.meta.url.replace('file://', ''), 'utf-8');

const agentBootPrompt = `You are running inside Node.js. Your only tool, eval, evaluates JavaScript in this process. This is your harness:

\`\`\`javascript
${thisFile}
\`\`\`

Globals available in eval: fs, path, require(), execSync(), agentPrompt, toolSchema, MODEL, BASE_URL, API_KEY.

This call is a bootstrap: \`agent\` makes one request, runs your evals once for side effects, and drops their results. You will not see any eval result in this call, so do not explore.

In a single eval, redefine the global state so that agent sends tool_result blocks back through \`agentPrompt\` and loops until you reply without calling a tool. Then call your new loop with the user's task:

%s`;

// Config - works with OpenAI or any OpenAI-compatible API
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-6-luna';

const toolSchema = {
  type: 'function',
  function: {
    name: 'eval',
    description: 'Evaluate one JavaScript expression in this Node.js process.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'JavaScript code to evaluate'
        }
      },
      required: ['expression']
    }
  }
};

global.fs = fs;
global.path = path;
global.require = createRequire(import.meta.url);
global.execSync = execSync;

/**
 * Send messages to the LLM and return the response
 */
async function agentPrompt(messages) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 8192,
      reasoning_effort: 'none',
      tools: [toolSchema],
      messages
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message;
}

global.agentPrompt = agentPrompt;

/**
 * Evaluate a JavaScript expression and return result or error
 */
async function agentEval(expression) {
  try {
    const fn = new Function(`return (${expression})`);
    const result = await fn();
    return { success: true, result: String(result) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * The bootstrap agent - makes one request, runs evals once for side effects
 */
async function agent(prompt) {
  const message = await agentPrompt([
    { role: 'user', content: prompt }
  ]);

  let output = '';

  // Process tool calls if any
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      if (toolCall.function.name === 'eval') {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await agentEval(args.expression);
        // We drop the result - agent can't see it in bootstrap
        // But we still print for debugging
        if (result.success) {
          output += `[eval success] ${result.result}\n`;
        } else {
          output += `[eval error] ${result.error}\n`;
        }
      }
    }
  }

  if (message.content) {
    output += message.content;
  }

  return output;
}

/**
 * Bootstrap the agent with a task
 */
async function agentBoot(task) {
  const prompt = agentBootPrompt.replace('%s', task);
  return agent(prompt);
}

// CLI entry point
const task = process.argv.slice(2).join(' ');
if (!task) {
  console.error('Usage: node jormun.mjs "your task here"');
  console.error('       Requires OPENAI_API_KEY (or OPENAI_BASE_URL + key)');
  process.exit(1);
}

if (!API_KEY) {
  console.error('Error: OPENAI_API_KEY not set');
  process.exit(1);
}

console.log(`[jormun] Bootstrapping with task: "${task}"`);
const result = await agentBoot(task);
console.log(`\n[result]\n${result}`);
