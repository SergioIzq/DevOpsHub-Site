import { defineCollection, z } from 'astro:content';

const articulosCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    categoria: z.enum(['docker', 'dotnet', 'angular', 'vps-hosting', 'comparativas']),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false)
  })
});

export const collections = {
  articulos: articulosCollection
};
