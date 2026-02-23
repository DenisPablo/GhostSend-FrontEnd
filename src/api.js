const BASE_URL = 'http://localhost:5257/api/v1/files';

export const api = {
    async uploadFile(fileBlob, maxDownloads, lifeTimeHours) {
        const formData = new FormData();
        // GhostSend Backend validation requires a file
        // We send obscured name and mime to keep it zero-knowledge
        formData.append('File', new File([fileBlob], 'encrypted.dat', { type: 'application/octet-stream' }));

        if (maxDownloads) {
            formData.append('MaxDownloads', maxDownloads.toString());
        }

        if (lifeTimeHours) {
            const hours = parseInt(lifeTimeHours, 10);
            const d = Math.floor(hours / 24);
            const h = hours % 24;
            // .NET TimeSpan standard representation parsing expects [d.]hh:mm:ss
            const timeSpanStr = d > 0
                ? `${d}.${h.toString().padStart(2, '0')}:00:00`
                : `${h.toString().padStart(2, '0')}:00:00`;

            formData.append('LifeTime', timeSpanStr);
        }

        const res = await fetch(`${BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            let errorMsg = 'Upload failed';
            try {
                const errData = await res.json();
                errorMsg = errData.Title || errData.title || errorMsg;
            } catch { }
            throw new Error(errorMsg);
        }

        return res.json(); // Returns { id, deleteToken }
    },

    async getMetadata(id) {
        const res = await fetch(`${BASE_URL}/GetMetadata?Id=${id}`);
        if (!res.ok) throw new Error('File not found or expired');
        return res.json();
    },

    async downloadFile(id) {
        const res = await fetch(`${BASE_URL}/GetFile?Id=${id}`);
        if (!res.ok) throw new Error('File download failed or expired');
        return res.arrayBuffer();
    },

    async deleteFile(id, deleteToken) {
        const res = await fetch(`${BASE_URL}/Delete?Id=${id}&DeleteToken=${deleteToken}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Delete failed');
        return true;
    }
}
