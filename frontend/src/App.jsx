import { useCallback, useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [accessToken, setAccessToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDocuments = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await listDocuments(accessToken);
      setDocuments(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      loadDocuments();
    } else {
      setDocuments([]);
      setIsLoading(false);
    }
  }, [loadDocuments]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Sistema interno</p>
          <h1>Documentos</h1>
        </div>
      </header>

      <div className="app-content">
        <form
          className="panel access-panel"
          onSubmit={(event) => {
            event.preventDefault();
            setAccessToken(tokenInput.trim());
          }}
        >
          <label htmlFor="access-token">Token de acesso</label>
          <div className="access-controls">
            <input
              id="access-token"
              type="password"
              autoComplete="current-password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              required
            />
            <button className="primary-button" type="submit">
              Acessar
            </button>
            {accessToken && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => setAccessToken('')}
              >
                Sair
              </button>
            )}
          </div>
        </form>

        {accessToken ? (
          <>
            <UploadComponent
              accessToken={accessToken}
              onUploaded={loadDocuments}
            />
            <DocumentList
              accessToken={accessToken}
              documents={documents}
              isLoading={isLoading}
              error={error}
            />
          </>
        ) : (
          <p className="state-message">Informe o token para acessar os documentos.</p>
        )}
      </div>
    </main>
  );
}
