import { fileURLToPath } from "url";
import path, { dirname } from "path";

// ES Modüllerinde __dirname'i elde etmenin standart yolu
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  // turbopack ayarı genellikle CLI üzerinden yapılır.
};

export default nextConfig;
