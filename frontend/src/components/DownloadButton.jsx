import { getDownloadUrl } from '../services/documentApi.js';

export default function DownloadButton({ documentId, documentName }) {
  return (
    <a
      className="download-button"
      href={getDownloadUrl(documentId)}
      download={documentName}
      aria-label={`Baixar ${documentName}`}
    >
      Baixar
    </a>
  );
}
