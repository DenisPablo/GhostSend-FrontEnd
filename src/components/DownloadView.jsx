import React, { useState, useEffect } from 'react';
import { DownloadCloud, Loader2, FileWarning, KeyRound, AlertCircle, Trash2 } from 'lucide-react';
import { api } from '../api';
import { WebCryptoService } from '../WebCryptoService';

export function DownloadView({ fileId }) {
    const [metadata, setMetadata] = useState(null);
    const [loadingMeta, setLoadingMeta] = useState(true);

    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState(null);

    const [hashData, setHashData] = useState(null);

    useEffect(() => {
        async function loadMeta() {
            try {
                const hash = window.location.hash;
                if (!hash) {
                    throw new Error("Encryption key missing. Ensure you opened the full link (including the # sign).");
                }

                // Dry parse hash to ensure valid key and extract name before even trying to download
                const parsedData = await WebCryptoService.importFromHash(hash);
                setHashData(parsedData);

                const data = await api.getMetadata(fileId);
                setMetadata(data);
            } catch (err) {
                setError(err.message || "File unavailable or expired");
            } finally {
                setLoadingMeta(false);
            }
        }

        loadMeta();
    }, [fileId]);

    const handleDownload = async () => {
        if (!hashData) return;
        setDownloading(true);
        setError(null);

        try {
            // 1. Download encrypted blob from server
            const encryptedBuffer = await api.downloadFile(fileId);

            // 2. Decrypt locally with the parsed key matching the original signature
            const decryptedBlob = await WebCryptoService.decryptFile(
                encryptedBuffer,
                hashData.key,
                hashData.iv,
                hashData.mimeType
            );

            // 3. Trigger raw browser download
            const url = URL.createObjectURL(decryptedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = hashData.originalName || 'secret.dat';
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // We should re-fetch metadata because CurrentDownloads updated
            const updatedMeta = await api.getMetadata(fileId);
            setMetadata(updatedMeta);

        } catch (err) {
            console.error(err);
            setError("Decryption failed. The file may be corrupt or the link is invalid.");
        } finally {
            setDownloading(false);
        }
    };

    const handleDelete = async () => {
        const token = prompt("Enter the Secret Delete Token for this file to delete it permanently:");
        if (!token) return;

        try {
            setDownloading(true);
            await api.deleteFile(fileId, token);
            setMetadata(null);
            setError("File was successfully deleted.");
        } catch (err) {
            setError(err.message || "Failed to delete file. Check the token.");
        } finally {
            setDownloading(false);
        }
    };

    if (loadingMeta) {
        return (
            <div className="glass-panel text-center">
                <Loader2 className="loader" size={48} color="var(--accent)" style={{ margin: '0 auto 1rem', display: 'block' }} />
                <h3>Locating encrypted file...</h3>
            </div>
        );
    }

    if (error || !metadata) {
        return (
            <div className="glass-panel text-center" style={{ border: '1px solid var(--danger)' }}>
                <FileWarning size={64} color="var(--danger)" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
                <h2 style={{ marginBottom: '0.5rem' }}>Access Denied</h2>
                <p className="subtitle" style={{ color: 'var(--text-main)' }}>{error}</p>
                <button
                    className="btn"
                    onClick={() => window.location.href = '/'}
                >
                    Go back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="glass-panel text-center">
            <div style={{ background: 'rgba(107, 76, 255, 0.1)', padding: '1.5rem', borderRadius: '50%', width: '100px', height: '100px', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={48} color="var(--accent)" />
            </div>

            <h2 style={{ marginBottom: '0.5rem', wordBreak: 'break-all' }}>{hashData ? hashData.originalName : metadata.fileName}</h2>
            <p className="subtitle" style={{ marginBottom: '2rem' }}>
                {(metadata.size / 1024 / 1024).toFixed(2)} MB • {metadata.maxDownloads ? `Downloads: ${metadata.currentDownloads} / ${metadata.maxDownloads}` : `${metadata.currentDownloads} downloads`}
            </p>

            {error && <div className="toast error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

            <button className="btn" onClick={handleDownload} disabled={downloading} style={{ padding: '1rem', fontSize: '1.2rem', marginBottom: '1rem' }}>
                {downloading ? (
                    <><Loader2 className="loader" size={24} /> Decrypting...</>
                ) : (
                    <><DownloadCloud size={24} /> Download Securely</>
                )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn btn-danger" onClick={handleDelete} disabled={downloading} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto' }}>
                    <Trash2 size={16} /> Delete now
                </button>
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', textAlign: 'left', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <AlertCircle size={20} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    This file is end-to-end encrypted. GhostSend servers only store mathematical noise and cannot scan or read your file. Decryption happens entirely in your browser.
                </p>
            </div>
        </div>
    );
}
