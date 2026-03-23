// vite.config.ts
import { defineConfig } from "file:///C:/Users/JONAS/gastronom-iaa/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/JONAS/gastronom-iaa/node_modules/@vitejs/plugin-react-swc/index.js";
import path2 from "path";
import { VitePWA } from "file:///C:/Users/JONAS/gastronom-iaa/node_modules/vite-plugin-pwa/dist/index.js";

// vite-plugin-validate-manifest.ts
import fs from "fs";
import path from "path";
var MAGIC_BYTES = {
  "image/png": { bytes: [137, 80, 78, 71], type: "image/png" },
  "image/jpeg": { bytes: [255, 216, 255], type: "image/jpeg" },
  "image/webp": { bytes: [82, 73, 70, 70], type: "image/webp" },
  "image/x-icon": { bytes: [0, 0, 1, 0], type: "image/x-icon" }
};
function detectFileType(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    for (const [mime, { bytes }] of Object.entries(MAGIC_BYTES)) {
      if (bytes.every((b, i) => buffer[i] === b)) return mime;
    }
    return null;
  } catch {
    return null;
  }
}
function validateManifestIcons() {
  return {
    name: "validate-manifest-icons",
    buildStart() {
      const manifestPath = path.resolve("public/manifest.json");
      if (!fs.existsSync(manifestPath)) return;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const icons = manifest.icons || [];
      const warnings = [];
      let fixed = false;
      for (const icon of icons) {
        const filePath = path.resolve("public", icon.src.replace(/^\//, ""));
        if (!fs.existsSync(filePath)) {
          warnings.push(`\u274C Icon file not found: ${icon.src}`);
          continue;
        }
        const actualType = detectFileType(filePath);
        if (!actualType) {
          warnings.push(`\u26A0\uFE0F Could not detect file type for: ${icon.src}`);
          continue;
        }
        if (icon.type && icon.type !== actualType) {
          console.warn(`\x1B[33m\u26A0\uFE0F Auto-fixing type for ${icon.src}: "${icon.type}" \u2192 "${actualType}"\x1B[0m`);
          icon.type = actualType;
          fixed = true;
        }
      }
      for (const w of warnings) console.warn(`\x1B[33m${w}\x1B[0m`);
      if (fixed) {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
        console.log("\x1B[32m\u2705 Manifest icon types auto-fixed.\x1B[0m");
      }
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "C:\\Users\\JONAS\\gastronom-iaa";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react(),
    validateManifestIcons(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.jpg", "screenshots/*.jpg", "*.svg", "robots.txt"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path2.resolve(__vite_injected_original_dirname, "./src"),
      react: path2.resolve(__vite_injected_original_dirname, "node_modules/react"),
      "react-dom": path2.resolve(__vite_injected_original_dirname, "node_modules/react-dom"),
      "react/jsx-runtime": path2.resolve(__vite_injected_original_dirname, "node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path2.resolve(__vite_injected_original_dirname, "node_modules/react/jsx-dev-runtime.js")
    },
    dedupe: ["react", "react-dom"]
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "vaul"
          ],
          "vendor-charts": ["recharts"],
          "vendor-pdf": ["jspdf", "html2canvas"],
          "vendor-animations": ["framer-motion"]
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAidml0ZS1wbHVnaW4tdmFsaWRhdGUtbWFuaWZlc3QudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxKT05BU1xcXFxnYXN0cm9ub20taWFhXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxKT05BU1xcXFxnYXN0cm9ub20taWFhXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9KT05BUy9nYXN0cm9ub20taWFhL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcclxuaW1wb3J0IHsgdmFsaWRhdGVNYW5pZmVzdEljb25zIH0gZnJvbSBcIi4vdml0ZS1wbHVnaW4tdmFsaWRhdGUtbWFuaWZlc3RcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgaG1yOiB7XHJcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICB2YWxpZGF0ZU1hbmlmZXN0SWNvbnMoKSxcclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6IFwiYXV0b1VwZGF0ZVwiLFxyXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbXCJpY29ucy8qLmpwZ1wiLCBcInNjcmVlbnNob3RzLyouanBnXCIsIFwiKi5zdmdcIiwgXCJyb2JvdHMudHh0XCJdLFxyXG4gICAgICBtYW5pZmVzdDogZmFsc2UsXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLGpwZyxqcGVnLHdlYnAsd29mZix3b2ZmMn1cIl0sXHJcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiBcIkNhY2hlRmlyc3RcIixcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJnb29nbGUtZm9udHMtY2FjaGVcIixcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMCxcclxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdzdGF0aWNcXC5jb21cXC8uKi9pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiBcIkNhY2hlRmlyc3RcIixcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJnc3RhdGljLWZvbnRzLWNhY2hlXCIsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvLipcXC5zdXBhYmFzZVxcLmNvXFwvLiovaSxcclxuICAgICAgICAgICAgaGFuZGxlcjogXCJOZXR3b3JrRmlyc3RcIixcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJzdXBhYmFzZS1jYWNoZVwiLFxyXG4gICAgICAgICAgICAgIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogMTAsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogNTAsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgICByZWFjdDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJub2RlX21vZHVsZXMvcmVhY3RcIiksXHJcbiAgICAgIFwicmVhY3QtZG9tXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwibm9kZV9tb2R1bGVzL3JlYWN0LWRvbVwiKSxcclxuICAgICAgXCJyZWFjdC9qc3gtcnVudGltZVwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIm5vZGVfbW9kdWxlcy9yZWFjdC9qc3gtcnVudGltZS5qc1wiKSxcclxuICAgICAgXCJyZWFjdC9qc3gtZGV2LXJ1bnRpbWVcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJub2RlX21vZHVsZXMvcmVhY3QvanN4LWRldi1ydW50aW1lLmpzXCIpLFxyXG4gICAgfSxcclxuICAgIGRlZHVwZTogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIl0sXHJcbiAgfSxcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGluY2x1ZGU6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCIsIFwicmVhY3QvanN4LXJ1bnRpbWVcIiwgXCJyZWFjdC9qc3gtZGV2LXJ1bnRpbWVcIl0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA2MDAsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgXCJ2ZW5kb3ItcmVhY3RcIjogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC1yb3V0ZXItZG9tXCJdLFxyXG4gICAgICAgICAgXCJ2ZW5kb3ItdWlcIjogW1xyXG4gICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1kaWFsb2dcIixcclxuICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudVwiLFxyXG4gICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zZWxlY3RcIixcclxuICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdGFic1wiLFxyXG4gICAgICAgICAgICBcInZhdWxcIixcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICBcInZlbmRvci1jaGFydHNcIjogW1wicmVjaGFydHNcIl0sXHJcbiAgICAgICAgICBcInZlbmRvci1wZGZcIjogW1wianNwZGZcIiwgXCJodG1sMmNhbnZhc1wiXSxcclxuICAgICAgICAgIFwidmVuZG9yLWFuaW1hdGlvbnNcIjogW1wiZnJhbWVyLW1vdGlvblwiXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEpPTkFTXFxcXGdhc3Ryb25vbS1pYWFcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEpPTkFTXFxcXGdhc3Ryb25vbS1pYWFcXFxcdml0ZS1wbHVnaW4tdmFsaWRhdGUtbWFuaWZlc3QudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0pPTkFTL2dhc3Ryb25vbS1pYWEvdml0ZS1wbHVnaW4tdmFsaWRhdGUtbWFuaWZlc3QudHNcIjtpbXBvcnQgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHR5cGUgeyBQbHVnaW4gfSBmcm9tICd2aXRlJztcclxuXHJcbmNvbnN0IE1BR0lDX0JZVEVTOiBSZWNvcmQ8c3RyaW5nLCB7IGJ5dGVzOiBudW1iZXJbXTsgdHlwZTogc3RyaW5nIH0+ID0ge1xyXG4gICdpbWFnZS9wbmcnOiB7IGJ5dGVzOiBbMHg4OSwgMHg1MCwgMHg0RSwgMHg0N10sIHR5cGU6ICdpbWFnZS9wbmcnIH0sXHJcbiAgJ2ltYWdlL2pwZWcnOiB7IGJ5dGVzOiBbMHhGRiwgMHhEOCwgMHhGRl0sIHR5cGU6ICdpbWFnZS9qcGVnJyB9LFxyXG4gICdpbWFnZS93ZWJwJzogeyBieXRlczogWzB4NTIsIDB4NDksIDB4NDYsIDB4NDZdLCB0eXBlOiAnaW1hZ2Uvd2VicCcgfSxcclxuICAnaW1hZ2UveC1pY29uJzogeyBieXRlczogWzB4MDAsIDB4MDAsIDB4MDEsIDB4MDBdLCB0eXBlOiAnaW1hZ2UveC1pY29uJyB9LFxyXG59O1xyXG5cclxuZnVuY3Rpb24gZGV0ZWN0RmlsZVR5cGUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBidWZmZXIgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgpO1xyXG4gICAgZm9yIChjb25zdCBbbWltZSwgeyBieXRlcyB9XSBvZiBPYmplY3QuZW50cmllcyhNQUdJQ19CWVRFUykpIHtcclxuICAgICAgaWYgKGJ5dGVzLmV2ZXJ5KChiLCBpKSA9PiBidWZmZXJbaV0gPT09IGIpKSByZXR1cm4gbWltZTtcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVNYW5pZmVzdEljb25zKCk6IFBsdWdpbiB7XHJcbiAgcmV0dXJuIHtcclxuICAgIG5hbWU6ICd2YWxpZGF0ZS1tYW5pZmVzdC1pY29ucycsXHJcbiAgICBidWlsZFN0YXJ0KCkge1xyXG4gICAgICBjb25zdCBtYW5pZmVzdFBhdGggPSBwYXRoLnJlc29sdmUoJ3B1YmxpYy9tYW5pZmVzdC5qc29uJyk7XHJcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhtYW5pZmVzdFBhdGgpKSByZXR1cm47XHJcblxyXG4gICAgICBjb25zdCBtYW5pZmVzdCA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1hbmlmZXN0UGF0aCwgJ3V0Zi04JykpO1xyXG4gICAgICBjb25zdCBpY29uczogeyBzcmM6IHN0cmluZzsgdHlwZT86IHN0cmluZyB9W10gPSBtYW5pZmVzdC5pY29ucyB8fCBbXTtcclxuICAgICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XHJcbiAgICAgIGxldCBmaXhlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgZm9yIChjb25zdCBpY29uIG9mIGljb25zKSB7XHJcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLnJlc29sdmUoJ3B1YmxpYycsIGljb24uc3JjLnJlcGxhY2UoL15cXC8vLCAnJykpO1xyXG5cclxuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKSB7XHJcbiAgICAgICAgICB3YXJuaW5ncy5wdXNoKGBcdTI3NEMgSWNvbiBmaWxlIG5vdCBmb3VuZDogJHtpY29uLnNyY31gKTtcclxuICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYWN0dWFsVHlwZSA9IGRldGVjdEZpbGVUeXBlKGZpbGVQYXRoKTtcclxuICAgICAgICBpZiAoIWFjdHVhbFR5cGUpIHtcclxuICAgICAgICAgIHdhcm5pbmdzLnB1c2goYFx1MjZBMFx1RkUwRiBDb3VsZCBub3QgZGV0ZWN0IGZpbGUgdHlwZSBmb3I6ICR7aWNvbi5zcmN9YCk7XHJcbiAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpY29uLnR5cGUgJiYgaWNvbi50eXBlICE9PSBhY3R1YWxUeXBlKSB7XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oYFxceDFiWzMzbVx1MjZBMFx1RkUwRiBBdXRvLWZpeGluZyB0eXBlIGZvciAke2ljb24uc3JjfTogXCIke2ljb24udHlwZX1cIiBcdTIxOTIgXCIke2FjdHVhbFR5cGV9XCJcXHgxYlswbWApO1xyXG4gICAgICAgICAgaWNvbi50eXBlID0gYWN0dWFsVHlwZTtcclxuICAgICAgICAgIGZpeGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZvciAoY29uc3QgdyBvZiB3YXJuaW5ncykgY29uc29sZS53YXJuKGBcXHgxYlszM20ke3d9XFx4MWJbMG1gKTtcclxuXHJcbiAgICAgIGlmIChmaXhlZCkge1xyXG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMobWFuaWZlc3RQYXRoLCBKU09OLnN0cmluZ2lmeShtYW5pZmVzdCwgbnVsbCwgMikgKyAnXFxuJyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1xceDFiWzMybVx1MjcwNSBNYW5pZmVzdCBpY29uIHR5cGVzIGF1dG8tZml4ZWQuXFx4MWJbMG0nKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFEsU0FBUyxvQkFBb0I7QUFDM1MsT0FBTyxXQUFXO0FBQ2xCLE9BQU9BLFdBQVU7QUFDakIsU0FBUyxlQUFlOzs7QUNIMFIsT0FBTyxRQUFRO0FBQ2pVLE9BQU8sVUFBVTtBQUdqQixJQUFNLGNBQWlFO0FBQUEsRUFDckUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxLQUFNLElBQU0sSUFBTSxFQUFJLEdBQUcsTUFBTSxZQUFZO0FBQUEsRUFDbEUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxLQUFNLEtBQU0sR0FBSSxHQUFHLE1BQU0sYUFBYTtBQUFBLEVBQzlELGNBQWMsRUFBRSxPQUFPLENBQUMsSUFBTSxJQUFNLElBQU0sRUFBSSxHQUFHLE1BQU0sYUFBYTtBQUFBLEVBQ3BFLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxHQUFNLEdBQU0sR0FBTSxDQUFJLEdBQUcsTUFBTSxlQUFlO0FBQzFFO0FBRUEsU0FBUyxlQUFlLFVBQWlDO0FBQ3ZELE1BQUk7QUFDRixVQUFNLFNBQVMsR0FBRyxhQUFhLFFBQVE7QUFDdkMsZUFBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsS0FBSyxPQUFPLFFBQVEsV0FBVyxHQUFHO0FBQzNELFVBQUksTUFBTSxNQUFNLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRyxRQUFPO0FBQUEsSUFDckQ7QUFDQSxXQUFPO0FBQUEsRUFDVCxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVPLFNBQVMsd0JBQWdDO0FBQzlDLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLGFBQWE7QUFDWCxZQUFNLGVBQWUsS0FBSyxRQUFRLHNCQUFzQjtBQUN4RCxVQUFJLENBQUMsR0FBRyxX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
