import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import categories from "./data/categories.json";

const categoryIds = categories.map((c) => c.id) as [string, ...string[]];

const trips = defineCollection({
  loader: glob({ pattern: "*/index.md", base: "./src/content/trips" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      category: z.enum(categoryIds),
      start: z.coerce.date(),
      end: z.coerce.date().optional(),
      summary: z.string(),
      cover: image(),
      coverAlt: z.string(),
      countries: z.array(z.string()).default([]),
      states: z.array(z.string().length(2)).default([]),
      parks: z.array(z.string()).default([]),
      places: z
        .array(z.object({ name: z.string(), lat: z.number(), lng: z.number() }))
        .default([]),
      gallery: z
        .array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() }))
        .default([]),
      links: z
        .array(
          z.object({
            type: z.enum(["instagram", "facebook", "other"]),
            url: z.string().url(),
            label: z.string().optional(),
          }),
        )
        .default([]),
      sample: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

export const collections = { trips };
