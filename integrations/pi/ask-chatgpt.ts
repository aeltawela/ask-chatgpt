import { Type } from '@sinclair/typebox';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
export default function (pi) {
  pi.registerTool({
    name: 'ask_chatgpt',
    label: 'Ask ChatGPT',
    description: 'Ask ChatGPT for a focused second opinion. Temporary unless persist is explicitly true.',
    parameters: Type.Object({
      question: Type.String({ description: 'Question to ask ChatGPT.' }),
      persist: Type.Optional(Type.Boolean({ description: 'Save this conversation locally for later resume.' })),
      model: Type.Optional(Type.String()),
      reasoning: Type.Optional(Type.Union([Type.Literal('auto'), Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')]))
    }),
    async execute(_id, params) {
      const args = ['ask', '--question', params.question, '--json'];
      if (params.persist) args.push('--persist');
      if (params.model) args.push('--model', params.model);
      if (params.reasoning) args.push('--reasoning', params.reasoning);
      try {
        const { stdout } = await run('chatgpt-as-provider', args, { timeout: 180_000, maxBuffer: 4_000_000 });
        return { content: [{ type: 'text', text: JSON.stringify(JSON.parse(stdout)) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `ChatGPT consultation failed: ${error.stderr || error.message}` }], isError: true };
      }
    }
  });
}
