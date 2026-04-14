import fs from 'fs';
import path from 'path';

const pathsToDelete = [
  'src/app/api',
  'src/app/robots.ts',
  'src/app/sitemap.ts',
  'src/app/industries',
  'src/app/blog',
  'src/app/store',
  'src/app/(app)/ai-insights',
  'src/app/(app)/support',
  'src/app/(app)/inventory/troubleshoot'
];

const foldersToClear = [
  'src/actions',
  'src/ai'
];

console.log('--- Preparing Tauri Build: Stripping non-static components ---');

pathsToDelete.forEach(p => {
  const fullPath = path.resolve(process.cwd(), p);
  if (fs.existsSync(fullPath)) {
    console.log(`Deleting: ${p}`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
});

foldersToClear.forEach(p => {
  const fullPath = path.resolve(process.cwd(), p);
  if (fs.existsSync(fullPath)) {
    console.log(`Clearing folder for stubbing: ${p}`);
    fs.readdirSync(fullPath).forEach(file => {
        const filePath = path.join(fullPath, file);
        fs.rmSync(filePath, { recursive: true, force: true });
    });
  }
});

// Specific stubs for core app dependencies to satisfy imports
const stubs = [
    { path: 'src/ai/flows/customer-insights-flow.ts', content: 'export const getCustomerInsights = async () => ({ summary: "AI Insights disabled in desktop build", productSuggestions: [], engagementTactics: [] });' }
];

stubs.forEach(s => {
    const fullPath = path.resolve(process.cwd(), s.path);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, s.content);
    console.log(`Created stub: ${s.path}`);
});

console.log('--- Setting up root page redirect ---');
const rootPagePath = path.resolve(process.cwd(), 'src/app/page.tsx');
const redirectContent = `'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);
  return null;
}`;

if (fs.existsSync(rootPagePath)) {
    fs.writeFileSync(rootPagePath, redirectContent);
    console.log('Root page updated with redirect to /login');
}

console.log('--- Preparation Complete ---');
