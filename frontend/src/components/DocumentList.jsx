import DownloadButton from './DownloadButton.jsx';

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
}

export default function DocumentList({ documents, isLoading, error }) {
  return (
    <section className="panel document-panel" aria-labelledby="documents-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h2 id="documents-title">Documentos</h2>
        </div>
        <span className="document-count">{documents.length}</span>
      </div>

      {isLoading && <p className="state-message">Carregando documentos...</p>}
      {!isLoading && error && <p className="notice notice-error" role="alert">{error}</p>}
      {!isLoading && !error && documents.length === 0 && (
        <div className="empty-state">Nenhum documento enviado.</div>
      )}

      {!isLoading && !error && documents.length > 0 && (
        <div className="document-list">
          {documents.map((document) => (
            <article className="document-row" key={document.id}>
              <div className="document-info">
                <h3 title={document.originalName}>{document.originalName}</h3>
                <p>
                  {formatSize(document.size)} <span aria-hidden="true">·</span>{' '}
                  {formatDate(document.uploadedAt)}
                </p>
              </div>
              <DownloadButton
                documentId={document.id}
                documentName={document.originalName}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
