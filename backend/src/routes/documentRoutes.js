const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const documentService = require('../services/documentService');

const router = express.Router();

fs.mkdirSync(documentService.STORAGE_DIRECTORY, { recursive: true });

const upload = multer({
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
    fileSize: 25 * 1024 * 1024,
  },
});

function uploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'O arquivo excede o limite de 25 MiB.',
        },
      });
    }

    return res.status(400).json({
      error: {
        code: 'INVALID_UPLOAD',
        message: 'Não foi possível processar o arquivo enviado.',
      },
    });
  });
}

router.post('/upload', uploadMiddleware, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;
