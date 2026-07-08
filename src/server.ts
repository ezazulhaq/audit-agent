import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import * as crypto from 'node:crypto';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

import { GoogleGenAI } from '@google/genai';

app.post('/api/analyze-repo', async (req, res) => {
  const { githubUrl } = req.body;
  if (!githubUrl) {
    res.status(400).json({ error: 'No github URL provided.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] as string });
    
    // Simulate finding vulnerabilities (since we don't have semgrep)
    const vulnerabilities = [
      {
        id: crypto.randomUUID(),
        type: 'hardcoded-secret',
        severity: 'HIGH',
        description: 'Hardcoded secret detected in configuration file.',
        file: 'config/settings.json',
        line: 12,
        proposedFixSnippet: '',
        status: 'PENDING'
      },
      {
        id: crypto.randomUUID(),
        type: 'sql-injection',
        severity: 'CRITICAL',
        description: 'Potential SQL injection vulnerability in query builder.',
        file: 'src/db/query.js',
        line: 45,
        proposedFixSnippet: '',
        status: 'PENDING'
      }
    ];

    // Analyze vulnerabilities with Gemini
    for (const vuln of vulnerabilities) {
      const prompt = `Analyze this vulnerability in ${vuln.file} at line ${vuln.line}: ${vuln.description} (Type: ${vuln.type}). Generate a code snippet to fix it.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
           systemInstruction: 'You are a senior security engineer. Provide only the fixed code snippet without markdown blocks if possible, or keep it concise.'
        }
      });
      vuln.proposedFixSnippet = response.text || '/* Fix could not be generated */';
    }

    res.json({ status: 'AWAITING_APPROVAL', vulnerabilities });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ status: 'FAILED', error: msg });
  }
});

app.post('/api/patch-repo', async (req, res) => {
  const { vulnerabilities } = req.body;
  if (!vulnerabilities) {
     return;
  }
  // Simulate patching
  res.json({ status: 'COMPLETED', reportUrl: 'https://storage.googleapis.com/simulated/report.md' });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
