import { useCallback, useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await listDocuments();
      setDocuments(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
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
        <UploadComponent onUploaded={loadDocuments} />
        <DocumentList
          documents={documents}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </main>
  );
}
