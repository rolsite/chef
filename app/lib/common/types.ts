import type { Tool, ToolCallUnion } from 'ai';
import { z } from 'zod';

type EmptyArgs = z.ZodObject<Record<string, never>>;

export type ConvexToolSet = {
  deploy: Tool<EmptyArgs, string>;
  npmInstall: Tool<z.ZodObject<{ packages: z.ZodArray<z.ZodString> }>, string>;
};

export type ConvexToolCall = ToolCallUnion<ConvexToolSet>;

export type ConvexToolResult =
  | {
      toolName: 'deploy';
      args?: EmptyArgs;
      result?: string;
    }
  | {
      toolName: 'npmInstall';
      args: { packages: string[] };
      result: string;
    };
export type ConvexToolInvocation =
  | ({
      state: 'partial-call';
      step?: number;
    } & ConvexToolCall)
  | ({
      state: 'call';
      step?: number;
    } & ConvexToolCall)
  | ({
      state: 'result';
      step?: number;
    } & ConvexToolResult);
