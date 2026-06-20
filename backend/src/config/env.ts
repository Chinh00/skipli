import * as dotenv from 'dotenv';
import path from 'path';

// Support both common dev launch modes:
// - from backend/: npm run dev -> loads backend/.env as .env
// - from repo root: npm --prefix backend run dev -> loads backend/.env explicitly
// Docker/CI env vars still win because override is false by default.
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
