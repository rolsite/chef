import type { ActionFunctionArgs } from '@remix-run/node';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);
    await convex.mutation(api.openrouter.initializeModels);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error initializing models:', error);
    return new Response(JSON.stringify({ error: 'Failed to initialize models' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
