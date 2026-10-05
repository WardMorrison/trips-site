// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://trips.wardmorrison.com",
  trailingSlash: "ignore",
  prefetch: { prefetchAll: true, defaultStrategy: "viewport" },
});
