const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const documentService = require('../services/documentService');

const router = express.Router();

fs.mkdirSync(documentService.STORAGE_DIRECTORY, { recursive: true });

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const UPLOAD_WINDOW_MS = 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 10;
const MAX_STORAGE_SIZE = Number(
  process.env.DOCUMENT_STORAGE_MAX_BYTES || 1024 * 1024 * 1024,
);

if (!Number.isSafeInteger(MAX_STORAGE_SIZE) || MAX_STORAGE_SIZE <= 0) {
  throw new Error('DOCUMENT_STORAGE_MAX_BYTES deve ser um inteiro positivo.');
}

let reservedUploadBytes = 0;
let reservationQueue = Promise.resolve();
let uploadWindowStartedAt = Date.now();
let uploadRequestCount = 0;

function authenticate(req, res, next) {
  const expectedToken = process.env.DMS_API_TOKEN;
  if (!expectedToken) {
    return res.status(503).json({
      error: {
        code: 'AUTH_NOT_CONFIGURED',
        message: 'A API não está configurada para aceitar requisições.',
      },
    });
  }

  const authorization = req.get('authorization') || '';
  const token = authorization.match(/^Bearer (.+)$/i)?.[1];
  const supplied = Buffer.from(token || '');
  const expected = Buffer.from(expectedToken);
  const isValid = supplied.length === expected.length
    && crypto.timingSafeEqual(supplied, expected);

  if (!isValid) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token de acesso inválido ou ausente.',
      },
    });
  }

  return next();
}

function limitUploadRate(req, res, next) {
  const now = Date.now();
  if (now - uploadWindowStartedAt >= UPLOAD_WINDOW_MS) {
    uploadWindowStartedAt = now;
    uploadRequestCount = 0;
  }

  if (uploadRequestCount >= MAX_UPLOADS_PER_WINDOW) {
    return res.status(429).json({
      error: {
        code: 'UPLOAD_RATE_LIMITED',
        message: 'Limite de 10 uploads por minuto atingido.',
      },
    });
  }

  uploadRequestCount += 1;
  return next();
}

async function getStorageUsage() {
  const entries = await fs.promises.readdir(
    documentService.STORAGE_DIRECTORY,
    { withFileTypes: true },
  );
  const fileSizes = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const filePath = path.join(documentService.STORAGE_DIRECTORY, entry.name);
        const stats = await fs.promises.stat(filePath);
        return stats.size;
      }),
  );

  return fileSizes.reduce((total, size) => total + size, 0);
}

function reserveUploadSpace() {
  const reservation = reservationQueue.then(async () => {
    const usedBytes = await getStorageUsage();
    const availableBytes = MAX_STORAGE_SIZE - usedBytes - reservedUploadBytes;

    if (availableBytes <= 0) {
      const error = new Error('O armazenamento atingiu a capacidade máxima.');
      error.code = 'STORAGE_QUOTA_EXCEEDED';
      throw error;
    }

    const maxFileSize = Math.min(MAX_FILE_SIZE, availableBytes);
    reservedUploadBytes += maxFileSize;
    let released = false;

    return {
      maxFileSize,
      release() {
        if (!released) {
          reservedUploadBytes -= maxFileSize;
          released = true;
        }
      },
    };
  });

  reservationQueue = reservation.then(() => undefined, () => undefined);
  return reservation;
}

function createUpload(maxFileSize) {
  return multer({
    storage: multer.diskStorage({
      destination(req, file, callback) {
        callback(null, documentService.STORAGE_DIRECTORY);
      },
      filename(req, file, callback) {
        const extension = path.extname(file.originalname).slice(0, 20);
        callback(null, `${crypto.randomUUID()}${extension}`);
      },
    }),
    limits: {
      fileSize: maxFileSize,
      files: 1,
      fields: 0,
      parts: 2,
    },
  });
}

function uploadMiddleware(req, res, next) {
  reserveUploadSpace().then((reservation) => {
    createUpload(reservation.maxFileSize).single('file')(req, res, (error) => {
      reservation.release();
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        const isQuotaLimit = reservation.maxFileSize < MAX_FILE_SIZE;
        return res.status(413).json({
          error: {
            code: isQuotaLimit ? 'STORAGE_QUOTA_EXCEEDED' : 'FILE_TOO_LARGE',
            message: isQuotaLimit
              ? 'O arquivo excede o espaço disponível no armazenamento.'
              : 'O arquivo excede o limite de 25 MiB.',
          },
        });
      }

      if (!(error instanceof multer.MulterError)) {
        return next(error);
      }

      return res.status(400).json({
        error: {
          code: 'INVALID_UPLOAD',
          message: 'Não foi possível processar o arquivo enviado.',
        },
      });
    });
  }).catch(next);
}

router.post(
  '/upload',
  authenticate,
  limitUploadRate,
  uploadMiddleware,
  documentController.upload,
);
router.get('/documents', authenticate, documentController.list);
router.get('/documents/:id/download', authenticate, documentController.download);

module.exports = router;
