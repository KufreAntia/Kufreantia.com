import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
    featured: z.boolean().default(false),
    projectType: z.string(),
    role: z.string(),
    location: z.string(),
    year: z.string(),
    theme: z.enum(['blue', 'clay', 'dark']).default('blue'),
    intro: z.string(),
    overview: z.string(),
    context: z.string(),
    approach: z.string(),
    outcomes: z.string(),
    process: z.array(z.object({ title: z.string(), description: z.string() })).default([]),
    gallery: z.array(z.object({ image: z.string(), caption: z.string() })).default([]),
  }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/research' }),
  schema: z.object({ title: z.string(), summary: z.string(), status: z.string(), order: z.number() }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/publications' }),
  schema: z.object({ title: z.string(), publisher: z.string(), year: z.string(), type: z.string(), url: z.string().optional(), order: z.number() }),
});

const speaking = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/speaking' }),
  schema: z.object({ title: z.string(), venue: z.string(), year: z.string(), type: z.string(), location: z.string(), url: z.string().optional(), order: z.number() }),
});

const awards = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/awards' }),
  schema: z.object({ title: z.string(), organisation: z.string(), year: z.string(), category: z.string(), order: z.number() }),
});

const media = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/media' }),
  schema: z.object({ title: z.string(), outlet: z.string(), year: z.string(), type: z.string(), url: z.string().optional(), order: z.number() }),
});

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/gallery' }),
  schema: z.object({ title: z.string(), project: z.string(), image: z.string(), alt: z.string(), order: z.number() }),
});

export const collections = { projects, research, publications, speaking, awards, media, gallery };
