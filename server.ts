import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mock Weather API for V1
  app.get("/api/weather/suggestion", (req, res) => {
    const { location } = req.query;
    // Simulated forecast logic
    const chanceOfRain = Math.floor(Math.random() * 100);
    const temperature = 60 + Math.floor(Math.random() * 25);
    
    if (chanceOfRain > 50) {
      res.json({
        temp: temperature,
        condition: 'Rainy',
        suggestion: "⚠️ Rain forecasted. Suggest moving to Student Union Lounge or updating location.",
        warning: true
      });
    } else {
      res.json({
        temp: temperature,
        condition: 'Clear',
        suggestion: `☀️ ${temperature}°F - Great day for an outdoor event!`,
        warning: false
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
