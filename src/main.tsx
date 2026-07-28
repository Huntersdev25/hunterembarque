import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfill p/ crypto.randomUUID em navegadores antigos (Safari iOS < 15.4).
// Evita crash em telas que geram IDs no cliente (páginas admin/operacionais).
if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  (crypto as any).randomUUID = () =>
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
    );
}

createRoot(document.getElementById("root")!).render(<App />);
