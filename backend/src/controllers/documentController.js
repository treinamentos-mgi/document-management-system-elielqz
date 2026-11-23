const documentService = require('../services/documentService');

function sendJsonError(res, status, code, message) {
  return res.status(status).json({
    error: { code, message },
  });
}

function upload(req, res) {
  if (!req.file) {
    return sendJsonError(res, 400, 'INVALID_UPLOAD', 'Nenhum arquivo foi enviado.');
  }

  try {
    const document = documentService.createDocument(req.file);
    return res.status(201).json(document);
  } catch (error) {
    return sendJsonError(res, 500, 'UPLOAD_FAILED', 'Não foi possível registrar o documento.');
  }
}

function list(req, res) {
  return res.status(200).json(documentService.listDocuments());
}

function download(req, res) {
  const document = documentService.getDocument(req.params.id);

  if (!document) {
    return sendJsonError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const filePath = documentService.getStoredFilePath(document);
  return res.download(filePath, document.originalName, (error) => {
    if (error && !res.headersSent) {
      sendJsonError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado no armazenamento local.');
    } else if (error) {
      res.end();
    }
  });
}

module.exports = {
  upload,
  list,
  download,
};
