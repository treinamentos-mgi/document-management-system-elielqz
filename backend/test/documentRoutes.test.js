const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const accessToken = 'test-dms-token';
let app;
let server;
let baseUrl;
let storageDirectory;

before(async () => {
  storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  process.env.DOCUMENT_STORAGE_PATH = storageDirectory;
  process.env.DOCUMENT_STORAGE_MAX_BYTES = '16';
  process.env.DMS_API_TOKEN = accessToken;

  app = require('../src/app');
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.close();
    await once(server, 'close');
  }
  if (storageDirectory) {
    await fs.rm(storageDirectory, { recursive: true, force: true });
  }
});

function authHeaders(token = accessToken) {
  return { Authorization: `Bearer ${token}` };
}

function createUploadForm(contents, filename = 'document.txt') {
  const form = new FormData();
  form.append('file', new Blob([contents]), filename);
  return form;
}

test('protegendo endpoints de documentos com token compartilhado', async () => {
  const response = await fetch(`${baseUrl}/documents`);

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'UNAUTHORIZED');

  const downloadResponse = await fetch(
    `${baseUrl}/documents/nonexistent/download`,
  );
  assert.equal(downloadResponse.status, 401);
});

test('falha fechada se o token de API não estiver configurado', async () => {
  const configuredToken = process.env.DMS_API_TOKEN;
  delete process.env.DMS_API_TOKEN;

  try {
    const response = await fetch(`${baseUrl}/documents`, {
      headers: authHeaders(),
    });

    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'AUTH_NOT_CONFIGURED');
  } finally {
    process.env.DMS_API_TOKEN = configuredToken;
  }
});

test('upload, listagem e download não expõem nome interno e respeitam a quota', async () => {
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: createUploadForm('hello'),
  });

  const uploadResponseBody = await uploadResponse.text();
  assert.equal(uploadResponse.status, 201, uploadResponseBody);
  const createdDocument = JSON.parse(uploadResponseBody);
  assert.equal(createdDocument.originalName, 'document.txt');
  assert.equal(Object.hasOwn(createdDocument, 'storedName'), false);

  const storedFiles = await fs.readdir(storageDirectory);
  assert.equal(storedFiles.length, 1);
  assert.match(storedFiles[0], /^[0-9a-f-]{36}\.txt$/i);

  const invalidForm = createUploadForm('a');
  invalidForm.append('unexpected', 'value');
  const invalidUploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: invalidForm,
  });
  assert.equal(invalidUploadResponse.status, 400);

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: authHeaders(),
  });
  const documents = await listResponse.json();

  assert.equal(listResponse.status, 200);
  assert.equal(documents.length, 1);
  assert.equal(Object.hasOwn(documents[0], 'storedName'), false);

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${createdDocument.id}/download`,
    { headers: authHeaders() },
  );
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'hello');

  const concurrentUploads = await Promise.all([
    fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: createUploadForm('12345678', 'one.txt'),
    }),
    fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: createUploadForm('abcdefgh', 'two.txt'),
    }),
  ]);
  assert.deepEqual(
    concurrentUploads.map((response) => response.status).sort(),
    [201, 507],
  );

  const overQuotaResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: createUploadForm('this is too large'),
  });

  assert.equal(overQuotaResponse.status, 413);
  assert.equal((await overQuotaResponse.json()).error.code, 'STORAGE_QUOTA_EXCEEDED');
  assert.equal((await fs.readdir(storageDirectory)).length, 2);

  for (let upload = 0; upload < 5; upload += 1) {
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: createUploadForm('', `empty-${upload}.txt`),
    });
    assert.equal(response.status, 201);
  }

  const rateLimitedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: createUploadForm('', 'rate-limited.txt'),
  });
  assert.equal(rateLimitedResponse.status, 429);
  assert.equal((await rateLimitedResponse.json()).error.code, 'UPLOAD_RATE_LIMITED');
});
