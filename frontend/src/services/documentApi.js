const API_PREFIX = '/api';

async function readResponse(response) {
  if (response.ok) {
    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    return response;
  }

  let message = 'Não foi possível concluir a operação.';

  try {
    const body = await response.json();
    message = body.error?.message || message;
  } catch {
    // Mantém a mensagem padrão quando o servidor não envia JSON.
  }

  throw new Error(message);
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData,
  });

  return readResponse(response);
}

export async function listDocuments() {
  const response = await fetch(`${API_PREFIX}/documents`);
  return readResponse(response);
}

export function getDownloadUrl(documentId) {
  return `${API_PREFIX}/documents/${encodeURIComponent(documentId)}/download`;
}
