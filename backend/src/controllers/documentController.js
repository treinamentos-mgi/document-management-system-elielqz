const fs = require('node:fs');
const documentService = require('../services/documentService');

function sendJsonError(res, status, code, message) {
  return res.status(status).json({
    error: { code, message },
  });
}

function toPublicDocument(document) {
  const {
    id,
    originalName,
    size,
    uploadedAt,
    owner,
    mimeType,
  } = document;

  return { id, originalName, size, uploadedAt, owner, mimeType };
}

async function upload(req, res) {
  if (!req.file) {
    return sendJsonError(res, 400, 'INVALID_UPLOAD', 'Nenhum arquivo foi enviado.');
  }

  try {
    const document = documentService.createDocument(req.file);
    return res.status(201).json(toPublicDocument(document));
  } catch (error) {
    console.error('Falha ao registrar metadados do documento:', error);
    try {
      await fs.promises.unlink(req.file.path);
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') {
        console.error('Falha ao remover arquivo sem metadados:', cleanupError);
      }
    }

    return sendJsonError(res, 500, 'UPLOAD_FAILED', 'Não foi possível registrar o documento.');
  }
}

function list(req, res) {
  const documents = documentService.listDocuments().map(toPublicDocument);
  return res.status(200).json(documents);
}

function download(req, res) {
  const document = documentService.getDocument(req.params.id);

  if (!document) {
    return sendJsonError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const filePath = documentService.getStoredFilePath(document);
  return res.download(filePath, document.originalName, (error) => {
    if (error && !res.headersSent) {
      const isMissingFile = error.code === 'ENOENT';
      if (!isMissingFile) {
        console.error('Falha ao ler arquivo para download:', error);
      }
      sendJsonError(
        res,
        isMissingFile ? 404 : 500,
        isMissingFile ? 'DOCUMENT_NOT_FOUND' : 'DOWNLOAD_FAILED',
        isMissingFile
          ? 'Documento não encontrado no armazenamento local.'
          : 'Não foi possível baixar o documento.',
      );
    } else if (error) {
      console.error('Falha durante o envio do arquivo para download:', error);
      res.end();
    }
  });
}

module.exports = {
  upload,
  list,
  download,
};
