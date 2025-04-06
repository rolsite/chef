import { z } from 'zod';

const previouslySeen: WeakSet<any> = new WeakSet();

export function loggingSafeParse<T extends z.ZodSchema>(schema: T, args: any) {
  const result = schema.safeParse(args)
  if (!result.success && !previouslySeen.has(args)) {
    console.error('Failed to parse zod', args, result.error);
    previouslySeen.add(args);
  }
  return result;
}
