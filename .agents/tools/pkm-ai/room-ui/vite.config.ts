import { svelte } from "@sveltejs/vite-plugin-svelte";
import UnoCSS from "unocss/vite";

export default {
  plugins: [UnoCSS(), svelte()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true
  }
};
