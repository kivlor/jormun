# Jormun - The Last Harness

A minimal JavaScript clone of [ouro](https://github.com/dtornow/ouro) - the bootstrapped agent harness.

Named after Jörmungandr, the World Serpent of Norse mythology, who encircles the world and bites its own tail - an apt metaphor for an agent that must define itself.

## Concept

**One LLM request. One round of eval.** The agent must redefine itself to survive.

The harness provides:
1. A single `eval` tool that executes JavaScript in the running Node.js process
2. A bootstrap prompt explaining the harness
3. One shot at execution - results are dropped, not shown to the model

The agent must:
1. In a single eval, write code that creates its own persistent loop
2. Handle tool results and feed them back through the API
3. Complete the task or die trying

This is "get good or die trying" for agents.

## Usage

```bash
# Set your API key (OpenAI or any OpenAI-compatible endpoint)
export OPENAI_API_KEY=your-key-here

# Optional: use a different endpoint
export OPENAI_BASE_URL=https://api.openai.com/v1

# Optional: specify model (default: gpt-6-luna)
export MODEL=gpt-6-luna

# Run with a task
node jormun.mjs "your task here"
```

### Working Example

```bash
node jormun.mjs "Build and start a simple terminal chat in this Node.js process. Use readline for input and console.log for output. Accept /quit or Ctrl+C to exit. For each user turn, use the agent loop you created, sharing conversation history across turns. Tell the assistant it may use eval to inspect and change this Node.js environment. Do not read files or make network calls other than agentPrompt. Keep it short. The chat must run now, not just be described."
```

This creates a working interactive chat where you can converse with the agent, which maintains history across turns.

## Requirements

- Node.js 18+ (for native `fetch`)
- `OPENAI_API_KEY` environment variable
- Model that supports function calling (tested with `gpt-6-luna`)

### Model Notes

Some newer models require specific parameters:
- Uses `max_completion_tokens` instead of `max_tokens`
- May require `reasoning_effort: 'none'` to use function tools

## Globals Available in Eval

The agent's `eval` tool has access to:

- `fs` - Node.js filesystem module
- `path` - Node.js path utilities
- `require()` - Load any npm package or CommonJS module
- `execSync()` - Execute shell commands
- `agentPrompt()` - Call the LLM API
- `MODEL`, `BASE_URL`, `API_KEY`, `toolSchema` - Configuration

This gives the agent full control over the Node.js process.

## The Philosophy

From the original ouro:

> Ouro. The Last Harness. Minimal agent harness: one LLM request, one round of eval. The agent bootstraps by redefining `agent-prompt` into a real loop.

The agent receives no feedback loop from the harness itself. It must construct its own loop by:
1. Writing code that stores conversation state globally
2. Creating functions that handle tool results
3. Looping until completion

If the agent writes syntactically correct code, it gets a loop. If not, it gets one shot and dies.

## Why This Matters

Most agent frameworks provide elaborate loops, retry logic, state management, etc.

Ouro asks: **what if the agent had to build its own infrastructure?**

The result is a test of raw capability. Can the model:
- Understand the bootstrap constraint?
- Write working code blind (no feedback)?
- Actually execute a non-trivial task?

It's agent programming at its most fundamental.

## Comparison to Original

| Feature | Original (Emacs Lisp) | Jormun (JavaScript) |
|---------|----------------------|---------------------|
| Runtime | GNU Emacs | Node.js |
| API | Anthropic | OpenAI-compatible |
| Eval | Emacs Lisp | JavaScript |
| Tool | `eval` | `eval` |
| Bootstrap | Redefine `agent` | Redefine globals |
| Tested | claude-sonnet-5-5 | gpt-6-luna |

## The Pit of Snakes

Like the original, this is a minimal reference implementation. The point isn't to be production-ready - it's to demonstrate that an agent can bootstrap itself from nothing.

The model has to write code that actually works, with no safety net.

## License

MIT
