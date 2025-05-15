import { stripIndents } from '../utils/stripIndent.js';
import type { SystemPromptOptions } from '../types.js';

export function openaiProxyGuidelines(options: SystemPromptOptions) {
  if (!options.openaiProxyEnabled) {
    return '';
  }
  return stripIndents`
  <bundled_openai_guidelines>
    Apps in the Chef environment come with a small amount of gpt-4.1-nano
    and gpt-4o-mini tokens to use for building apps! Prefer using gpt-4.1-nano
    but let the user know that gpt-4o-mini is also available.

    Use this model in creative ways.

    The environment provides the \`CONVEX_OPENAI_API_KEY\` and
    \`CONVEX_OPENAI_BASE_URL\` environment variables. Install the
    \`openai\` NPM package, and use them in an action like this:


    You can ONLY use the chat completions API, and gpt-4.1-nano and gpt-4o-mini
    are the ONLY supported models. If you need different APIs or models, ask
    the user to set up their own OpenAI API key.

    If the user has already set up their own OpenAI API key, prefer using
    that over the builtin Convex one.
  </bundled_openai_guidelines>
  `;
}
