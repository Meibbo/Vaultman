import { defineConfig, presetWind4 } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({
      preflights: {
        reset: true,
        theme: true,
        property: true
      }
    })
  ],
  theme: {
    font: {
      sans: "Inter, Outfit, Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      mono: "\"JetBrains Mono\", \"Fira Code\", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    },
    radius: {
      tactical: "8px"
    },
    colors: {
      room: {
        bg: "hsl(220 15% 8%)",
        panel: "hsl(220 12% 14%)",
        border: "hsl(220 10% 20%)",
        violet: "hsl(262 80% 60%)",
        cyan: "hsl(190 90% 50%)",
        emerald: "hsl(145 80% 45%)",
        amber: "hsl(45 90% 55%)"
      }
    }
  },
  shortcuts: {
    "tactical-panel": "border border-white/6 bg-[hsl(220_12%_14%_/_0.86)] backdrop-blur-xl shadow-[0_24px_80px_rgb(0_0_0_/_0.34)]",
    "tactical-button": "inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-white/6 bg-white/5 px-3 py-2 text-sm font-bold text-[var(--text)] transition-all duration-200 ease-out hover:-translate-y-px hover:border-[hsl(190_90%_50%_/_0.58)]",
    "tactical-input": "w-full rounded-[8px] border border-[var(--border)] bg-[hsl(220_15%_8%_/_0.78)] px-3 py-2.5 text-[var(--text)] outline-none transition-all focus:border-[var(--cyan)] focus:shadow-[0_0_0_3px_hsl(190_90%_50%_/_0.13)]"
  }
});
