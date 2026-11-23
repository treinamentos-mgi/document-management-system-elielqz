const path = require('node:path');
const crypto = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

const STORAGE_DIRECTORY = process.env.DOCUMENT_STORAGE_PATH
  ? path.resolve(process.env.DOCUMENT_STORAGE_PATH)
  : path.join(__dirname, '..', '..', 'storage');

function createDocument(file) {
  const document = {
    id: crypto.randomUUID(),
    originalName: path.basename(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: process.env.DOCUMENT_OWNER || 'default-user',
    storedName: file.filename,
    mimeType: file.mimetype,
  };

  return documentRepository.create(document);
}

function listDocuments() {
  return documentRepository.findAll();
}

function getDocument(id) {
  return documentRepository.findById(id);
}

function getStoredFilePath(document) {
  return path.join(STORAGE_DIRECTORY, document.storedName);
}

module.exports = {
  STORAGE_DIRECTORY,
  createDocument,
  listDocuments,
  getDocument,
  getStoredFilePath,
};
