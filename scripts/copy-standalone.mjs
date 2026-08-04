import fs from "fs";
import path from "path";

const staticSrc = path.join(process.cwd(), ".next", "static");
const staticDest = path.join(process.cwd(), ".next", "standalone", ".next", "static");
const publicSrc = path.join(process.cwd(), "public");
const publicDest = path.join(process.cwd(), ".next", "standalone", "public");

if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log("Copied .next/static to .next/standalone/.next/static");
}

if (fs.existsSync(publicSrc)) {
  fs.mkdirSync(path.dirname(publicDest), { recursive: true });
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log("Copied public to .next/standalone/public");
}
