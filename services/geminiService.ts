import { GoogleGenAI, Modality, Part } from "@google/genai";

// Helper to convert image URL to base64
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
    const processBlob = (blob: Blob): Promise<{ base64: string; mimeType: string }> => {
        if (!blob.type.startsWith('image/')) {
            throw new Error('Fetched file is not an image.');
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string)?.split(',')[1];
                if (!base64String) {
                    reject(new Error("Failed to read base64 string from image."));
                    return;
                }
                resolve({ base64: base64String, mimeType: blob.type });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Attempt 1: Fetch via a CORS proxy.
    try {
        // Using a public proxy to bypass CORS issues. For a production app, a dedicated backend proxy is more robust.
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Proxy fetch failed with status: ${response.statusText}`);
        }
        const blob = await response.blob();
        return await processBlob(blob);
    } catch (proxyError) {
        console.warn("Proxy fetch failed:", proxyError);
        
        // Attempt 2: Direct fetch (as a fallback). This works for CORS-enabled image hosts.
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Direct fetch failed with status: ${response.statusText}`);
            }
            const blob = await response.blob();
            return await processBlob(blob);
        } catch (directError) {
            console.error("Direct fetch also failed:", directError);
            throw new Error("No se pudo cargar desde ese enlace. Podría ser una página web o el servidor está bloqueando las solicitudes. Por favor, haz clic derecho en la imagen que quieres usar, selecciona 'Copiar dirección de imagen' y pega ese nuevo enlace aquí.");
        }
    }
}

export async function generateImages(
    prompt: string,
    numImages: number,
    baseImageUrls: string[]
): Promise<string[]> {
    // A new GoogleGenAI instance is created for each call to ensure the latest key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const generationPromises: Promise<string>[] = [];

    for (let i = 0; i < numImages; i++) {
        const promise = (async () => {
            const parts: Part[] = [{ text: prompt }];
            const baseUrl = baseImageUrls[i];

            if (baseUrl && baseUrl.trim() !== '') {
                try {
                    const { base64, mimeType } = await urlToBase64(baseUrl);
                    parts.unshift({ // Add image part at the beginning for editing
                        inlineData: {
                            data: base64,
                            mimeType: mimeType,
                        },
                    });
                } catch (e) {
                    if (e instanceof Error) {
                        throw new Error(`Error con la Imagen Base ${i + 1}: ${e.message}`);
                    }
                    throw e;
                }
            }
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                }
            }
            throw new Error(`La imagen ${i + 1} no pudo ser generada.`);

        })();
        generationPromises.push(promise);
    }

    return Promise.all(generationPromises);
}