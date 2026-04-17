import fs from 'fs';
import path from 'path';

const pathsToDelete = [
  'src/app/api',
  'src/app/robots.ts',
  'src/app/sitemap.ts',
  'src/app/industries',
  'src/app/blog',
  'src/app/store',
  'src/app/admin-imamshaffy',
  'firestore.rules',
  'firestore.indexes.json',
  'firebase.json',
  'src/firebase/admin.ts',
  'src/lib/server'
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
    { path: 'src/ai/genkit.ts', content: 'export const ai = {}; export const getAI = () => ({});' },
    { path: 'src/ai/flows/customer-insights-flow.ts', content: 'export const getCustomerInsights = async () => ({ summary: "AI Insights disabled in desktop build", productSuggestions: [], engagementTactics: [] });' },
    { path: 'src/ai/flows/business-analysis-flow.ts', content: 'export const businessAnalysis = async () => ({ summary: "Tactical analysis is optimized for the cloud node.", metrics: {}, recommendations: [] });' },
    { path: 'src/ai/flows/product-troubleshoot-flow.ts', content: 'export const productTroubleshoot = async () => ({ solution: "Please connect to the command center via mobile or web for deeper diagnostics.", steps: [], confidence: 0 });' },
    { path: 'src/ai/flows/support-chat-flow.ts', content: 'export const zenevaSupportChat = async () => ({ response: "Direct support stream is available via the web terminal.", citations: [], suggestedActions: [] });' },
    { path: 'src/ai/flows/audit-log-analysis-flow.ts', content: 'export const analyzeAuditLogs = async () => ({ summary: "Security audit stream is encrypted for server-side processing only.", anomalies: [], riskScore: 0 });' },
    { path: 'src/ai/flows/visual-count-flow.ts', content: 'export const visualCount = async () => ({ count: 0, confidence: 0, details: "Hardware-accelerated visual counting requires active telemetry link." });' }
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
