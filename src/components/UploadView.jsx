import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, Copy, Loader2, Link } from 'lucide-react';
import { WebCryptoService } from '../WebCryptoService';
import { api } from '../api';

export function UploadView() {
    const [file, setFile] = useState(null);
    const [maxDownloads, setMaxDownloads] = useState('');
    const [lifeTimeHours, setLifeTimeHours] = useState('24'); // Default 1 day

    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setError(null);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);

        try {
            // 1. E2EE: Generate AES Key
            const key = await WebCryptoService.generateKey();

            // 2. Encrypt locally
            const { encryptedBlob, iv } = await WebCryptoService.encryptFile(file, key);

            // 3. Send encrypted blob to API
            const response = await api.uploadFile(
                encryptedBlob,
                maxDownloads ? parseInt(maxDownloads) : null,
                lifeTimeHours ? parseInt(lifeTimeHours) : null
            );

            // 4. Export Key+Metadata hash
            const hash = await WebCryptoService.exportToHash(key, iv, file.name, file.type);

            // 5. Construct URL
            const url = `${window.location.origin}/d/${response.fileId}#${hash}`;
            setResult({ url, deleteToken: response.deleteToken });
        } catch (err) {
            setError(err.message || 'Error uploading file');
        } finally {
            setUploading(false);
        }
    };

    const copyToClipboard = () => {
        if (result) {
            navigator.clipboard.writeText(result.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (result) {
        return (
            <div className="glass-panel text-center">
                <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
                <h2 style={{ marginBottom: '0.5rem' }}>Upload Complete!</h2>
                <p className="subtitle">Your file is encrypted and ready to share safely.</p>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', wordBreak: 'break-all' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{result.url}</span>
                </div>

                <button className="btn" onClick={copyToClipboard} style={{ marginBottom: '1.5rem' }}>
                    {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                    {copied ? 'Copied' : 'Copy Link'}
                </button>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Keep your link safe. If you lose it, the file cannot be decrypted again.
                </p>

                {result.deleteToken && (
                    <p style={{ fontSize: '0.75rem', marginTop: '1rem', opacity: 0.5 }}>
                        Delete token (save for emergencies): {result.deleteToken}
                    </p>
                )}

                <button
                    className="btn btn-danger"
                    style={{ marginTop: '1.5rem' }}
                    onClick={() => { setResult(null); setFile(null); }}
                >
                    Send another file
                </button>
            </div>
        );
    }

    return (
        <div className="glass-panel">

            <div
                className={`file-drop-area ${file ? 'active' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
            >
                <UploadCloud size={64} />
                {file ? (
                    <div>
                        <h3 style={{ margin: 0, color: 'white' }}>{file.name}</h3>
                        <p style={{ margin: '0.5rem 0 0', opacity: 0.7 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                ) : (
                    <div>
                        <h3>Drag & Drop your file</h3>
                        <p>or click to browse</p>
                    </div>
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label>Max Downloads (optional)</label>
                    <input
                        type="number"
                        className="form-control"
                        placeholder="e.g. 1"
                        value={maxDownloads}
                        onChange={(e) => setMaxDownloads(e.target.value)}
                    />
                </div>
                <div>
                    <label>Expires in Hours (optional)</label>
                    <input
                        type="number"
                        className="form-control"
                        placeholder="e.g. 24"
                        value={lifeTimeHours}
                        onChange={(e) => setLifeTimeHours(e.target.value)}
                    />
                </div>
            </div>

            {error && <div className="toast error">{error}</div>}

            <button className="btn" onClick={handleUpload} disabled={!file || uploading} style={{ marginTop: '1rem' }}>
                {uploading ? <Loader2 className="loader" size={20} /> : <Link size={20} />}
                {uploading ? 'Encrypting & Uploading...' : 'Encrypt & Get Link'}
            </button>

        </div>
    );
}
