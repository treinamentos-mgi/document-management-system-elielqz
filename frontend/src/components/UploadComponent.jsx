import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ onUploaded }) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setIsError(true);
      setMessage('Selecione um arquivo para enviar.');
      return;
    }

    setIsUploading(true);
    setMessage('');
    setIsError(false);

    try {
      await uploadDocument(selectedFile);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setMessage('Documento enviado com sucesso.');
      onUploaded?.();
    } catch (error) {
      setIsError(true);
      setMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="panel upload-panel" aria-labelledby="upload-title">
      <div>
        <p className="eyebrow">Novo documento</p>
        <h2 id="upload-title">Enviar arquivo</h2>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker">
          <input
            ref={inputRef}
            type="file"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] || null);
              setMessage('');
            }}
          />
          <span>{selectedFile ? selectedFile.name : 'Escolher arquivo'}</span>
        </label>

        <button className="primary-button" type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>

      {message && (
        <p className={isError ? 'notice notice-error' : 'notice notice-success'} role="status">
          {message}
        </p>
      )}
    </section>
  );
}
