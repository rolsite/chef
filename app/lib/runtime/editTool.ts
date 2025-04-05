import type { Tool } from "ai";
import { z } from "zod";

const editToolDescription = `
Make a single targeted edit to a file, replacing a fragment of text with a new
fragment of text.

Do NOT use this tool for initial app generation. Use it for small, focused changes
instead.

You MUST know a file's current contents before using this tool. This may
either be from context or previous use of the \`view\` tool.

The \`old\` and \`new\` parameters must be less than 1024 characters each.
`;

export const editToolParameters = z.object({
    path: z.string().describe('The absolute path to the file to edit.'),
    old: z.string().describe('The fragment of text to replace. Must be less than 1024 characters.'),
    new: z.string().describe('The new fragment of text to replace it with. Must be less than 1024 characters.'),
});

export const editTool: Tool = {
    description: editToolDescription,
    parameters: editToolParameters,
}