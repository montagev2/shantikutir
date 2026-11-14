import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_Gj28BB0ml6ZmUmjWWMqAYJYwmnLG';
const ROOT_DIR = path.resolve('.');

const IGNORE_DIRS = new Set(['node_modules', '.git', '.vercel', 'dist']);
const IGNORE_FILES = new Set(['.env', '.env.local', '.env.production']);

function getFileList(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const filePaths = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      filePaths.push(...getFileList(fullPath, baseDir));
    } else {
      if (IGNORE_FILES.has(entry.name)) continue;
      filePaths.push({ fullPath, relPath });
    }
  }
  return filePaths;
}

async function uploadFileWithRetry(sha, buf, relPath, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch('https://api.vercel.com/v2/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/octet-stream',
          'x-vercel-digest': sha,
          'Content-Length': String(buf.length)
        },
        body: buf
      });

      if (res.status === 200 || res.status === 201) {
        return true;
      }
      
      const text = await res.text();
      console.warn(`[WARN] File upload ${relPath} (${sha.slice(0, 8)}) returned ${res.status}: ${text}`);
      if (attempt === maxRetries) {
        throw new Error(`Failed to upload ${relPath} after ${maxRetries} attempts: ${text}`);
      }
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function deploy() {
  console.log('Scanning repository files...');
  const fileEntries = getFileList(ROOT_DIR);
  console.log(`Found ${fileEntries.length} files.`);

  console.log('Computing SHA-1 hashes and preparing upload...');
  const manifest = [];
  const uploads = [];
  const seenSha = new Set();

  for (const { fullPath, relPath } of fileEntries) {
    const buf = fs.readFileSync(fullPath);
    const sha = crypto.createHash('sha1').update(buf).digest('hex');
    manifest.push({
      file: relPath,
      sha: sha,
      size: buf.length
    });

    if (!seenSha.has(sha)) {
      seenSha.add(sha);
      uploads.push({ sha, buf, relPath });
    }
  }

  console.log(`Uploading ${uploads.length} unique files to Vercel CDN...`);
  // Upload with concurrency of 5
  const concurrency = 5;
  for (let i = 0; i < uploads.length; i += concurrency) {
    const batch = uploads.slice(i, i + concurrency);
    await Promise.all(batch.map(item => uploadFileWithRetry(item.sha, item.buf, item.relPath)));
    process.stdout.write(`Uploaded ${Math.min(i + concurrency, uploads.length)}/${uploads.length} files...\r`);
  }
  console.log(`\nAll files successfully verified/uploaded.`);

  console.log('Initiating Vercel deployment with manifest...');
  const res = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'shantikutir',
      project: PROJECT_ID,
      target: 'production',
      files: manifest
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Deployment creation failed with status ${res.status}:`, errText);
    process.exit(1);
  }

  const deployment = await res.json();
  console.log(`Deployment created: ${deployment.id}`);
  console.log(`Initial status: ${deployment.status || deployment.readyState}`);
  console.log(`Inspect URL: ${deployment.inspectorUrl}`);

  // Poll for completion
  console.log('Waiting for build to finish...');
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const checkRes = await fetch(`https://api.vercel.com/v13/deployments/${deployment.id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!checkRes.ok) continue;
    const data = await checkRes.json();
    const state = data.readyState || data.status;
    console.log(`Current state (${i + 1}): ${state}`);

    if (state === 'READY') {
      console.log('\n--- DEPLOYMENT SUCCESSFUL ---');
      console.log(`Production URL: https://${data.url}`);
      if (data.alias && data.alias.length > 0) {
        console.log(`Alias URLs: ${data.alias.map(a => `https://${a}`).join(', ')}`);
      }
      return;
    }
    if (state === 'ERROR' || state === 'CANCELED') {
      console.error('\n--- DEPLOYMENT FAILED ---');
      console.error(JSON.stringify(data.error || data, null, 2));
      process.exit(1);
    }
  }
}

deploy().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
