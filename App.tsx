import React, { useState, useCallback, useEffect } from 'react';
import { generateImages } from './services/geminiService';
import { SparklesIcon, ChatIcon, PlusIcon, XIcon, LoaderIcon, PhotographIcon } from './components/icons';

const MAX_IMAGES = 4;

interface UrlInputBoxProps {
  index: number;
  url: string;
  onUrlChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  disabled: boolean;
}

const UrlInputBox: React.FC<UrlInputBoxProps> = ({ url, onUrlChange, onRemove, index, disabled }) => {
  const [preview, setPreview] = useState<{ status: 'idle' | 'loading' | 'loaded' | 'error'; src: string | null }>({ status: 'idle', src: null });

  const handleUrlValidation = useCallback(() => {
    if (url && url.trim() !== '') {
      try {
        new URL(url);
      } catch (_) {
        setPreview({ status: 'error', src: null });
        return;
      }
      
      setPreview({ status: 'loading', src: null });
      const img = new Image();
      img.onload = () => setPreview({ status: 'loaded', src: url });
      img.onerror = () => setPreview({ status: 'error', src: null });
      img.src = url;
    } else {
      setPreview({ status: 'idle', src: null });
    }
  }, [url]);

  useEffect(() => {
    const handler = setTimeout(() => {
      handleUrlValidation();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [url, handleUrlValidation]);

  return (
    <div className="relative group bg-slate-900/70 border border-slate-700 rounded-lg p-3 flex flex-col justify-between text-center transition-all duration-300 hover:border-cyan-500 hover:bg-slate-800 h-full">
       <button 
        onClick={() => onRemove(index)}
        disabled={disabled}
        aria-label="Remove image"
        className="absolute top-2 right-2 text-slate-500 hover:text-red-400 disabled:opacity-50 transition-colors z-10">
          <XIcon className="w-5 h-5" />
      </button>

      <div className="w-full aspect-square flex items-center justify-center bg-slate-800/50 rounded-md mb-2 overflow-hidden">
        {preview.status === 'loading' && <LoaderIcon className="w-8 h-8 text-cyan-500 animate-spin" />}
        {preview.status === 'loaded' && preview.src && <img src={preview.src} alt="Vista previa" className="w-full h-full object-cover" />}
        {preview.status === 'error' && (
          <div className="p-2 text-center">
            <p className="text-xs font-semibold text-red-400">no genera la imagen</p>
          </div>
        )}
        {preview.status === 'idle' && (
          <div className="p-2 text-center">
             <PhotographIcon className="w-8 h-8 text-slate-600 mx-auto mb-1" />
            <p className="text-xs text-slate-500">Pega una URL para ver la vista previa</p>
          </div>
        )}
      </div>
      <input
        type="text"
        placeholder="Pega la URL de una imagen"
        value={url}
        onChange={(e) => onUrlChange(index, e.target.value)}
        disabled={disabled}
        className="w-full bg-slate-800 border border-slate-600 rounded-md text-xs p-1.5 text-center text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
      />
    </div>
  );
};

const Spinner = () => (
    <div className="flex flex-col items-center justify-center gap-4 my-8">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
        <p className="text-slate-400">Creando un poco de magia... por favor espera.</p>
    </div>
);

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [numImages, setNumImages] = useState<number>(4);
  const [baseImageUrls, setBaseImageUrls] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...baseImageUrls];
    newUrls[index] = value;
    setBaseImageUrls(newUrls);
  };
  
  const handleAddImage = () => {
    if (baseImageUrls.length < MAX_IMAGES) {
      setBaseImageUrls(prev => [...prev, '']);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setBaseImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleGenerateClick = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await generateImages(prompt, numImages, baseImageUrls);
      setGeneratedImages(images);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Ocurrió un error desconocido.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [prompt, numImages, baseImageUrls, isLoading]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-cyan-500/20 to-transparent -z-0 pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            Catan Studio
          </h1>
        </header>

        <main className="bg-slate-800/50 border border-slate-700 rounded-2xl shadow-2xl shadow-cyan-900/20 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Generador de Imágenes</h2>
          
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <textarea
              id="prompt"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              className="flex-grow w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:opacity-50"
              placeholder="Ej: Un gato astronauta cromado en un paisaje urbano synthwave..."
            />
            <button
              onClick={handleGenerateClick}
              disabled={isLoading || !prompt.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              <SparklesIcon className="w-5 h-5"/>
              {isLoading ? 'Generando...' : 'Generar'}
            </button>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            <label htmlFor="numImages" className="text-sm font-medium text-slate-400">
              Número de imágenes:
            </label>
             <input
              id="numImages"
              type="number"
              min="1"
              max="4"
              value={numImages}
              onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val >= 1 && val <= MAX_IMAGES) setNumImages(val);
              }}
              onBlur={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < 1) setNumImages(1);
                  if (val > MAX_IMAGES) setNumImages(MAX_IMAGES);
              }}
              disabled={isLoading}
              className="w-16 bg-slate-700 border border-slate-600 rounded-md text-sm p-2 text-center focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
            
          {error && (
            <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              <span className="font-bold">¡Ups! </span>{error}
            </div>
          )}

          {/* Base Images Section */}
          <div className="mt-6 border-t border-slate-700 pt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Imágenes Base <span className="text-sm font-light text-slate-400">(Opcional)</span></h3>
                {baseImageUrls.length < MAX_IMAGES && (
                    <button 
                      onClick={handleAddImage} 
                      disabled={isLoading}
                      className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition disabled:opacity-50">
                        <PlusIcon />
                        Añadir Imagen
                    </button>
                )}
            </div>
            {baseImageUrls.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {baseImageUrls.map((url, index) => (
                      <UrlInputBox 
                          key={index}
                          index={index}
                          url={url}
                          onUrlChange={handleUrlChange}
                          onRemove={handleRemoveImage}
                          disabled={isLoading}
                      />
                  ))}
              </div>
            ) : (
                <p className="text-slate-500 text-center text-sm py-4">Añade imágenes para guiar la generación de cada resultado.</p>
            )}
          </div>
        </main>

        {/* Results Section */}
        <section className="mt-12">
            {isLoading && <Spinner />}
            {generatedImages.length > 0 && (
                <div>
                    <h2 className="text-2xl font-semibold text-white mb-6 text-center">Tus Creaciones</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {generatedImages.map((src, index) => (
                            <div key={index} className="aspect-square bg-slate-800 rounded-lg overflow-hidden group transition-transform duration-300 hover:scale-105 shadow-lg">
                                <img src={src} alt={`Imagen generada ${index + 1}`} className="w-full h-full object-cover"/>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>

        <footer className="text-center text-xs text-slate-500 mt-12 py-4">
          Fuentes de Gemini / Powered by Google Gemini
        </footer>
      </div>
      <button className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-500 transition-transform transform hover:scale-110">
        <ChatIcon />
      </button>
    </div>
  );
};

export default App;