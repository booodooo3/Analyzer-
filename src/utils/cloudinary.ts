export const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary environment variables are missing (VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET).");
    }

    const chunkSize = 5 * 1024 * 1024; // 5MB chunks (minimum allowed by Cloudinary for chunked uploads except the last one)
    const totalSize = file.size;
    const uniqueUploadId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    let url = '';

    for (let start = 0; start < totalSize; start += chunkSize) {
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('upload_preset', uploadPreset);
        
        const contentRange = `bytes ${start}-${end - 1}/${totalSize}`;
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            headers: {
                'X-Unique-Upload-Id': uniqueUploadId,
                'Content-Range': contentRange
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        if (data.secure_url) {
            url = data.secure_url;
        }
    }
    
    if (!url) {
        throw new Error("Failed to retrieve secure_url from Cloudinary after upload.");
    }
    
    return url;
};
