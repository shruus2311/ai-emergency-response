import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, SwitchCamera, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export const LiveCameraCaptureModal: React.FC<Props> = ({ isOpen, onClose, onCapture }) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [snapped, setSnapped] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraLoading(true);
    setError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraLoading(false);
    } catch (err: any) {
      console.error('Camera stream error:', err);
      setCameraLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please grant camera access in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera hardware detected on this device.');
      } else {
        setError(`Unable to open camera: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSnapped(false);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Compress to high-efficiency JPEG
    const base64 = canvas.toDataURL('image/jpeg', 0.70);
    setSnapped(true);

    // Stop camera and send data to parent
    stopCamera();
    onCapture(base64);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 font-sans">
      
      {/* Top Controls */}
      <div className="w-full max-w-lg flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
            LIVE CAMERA FEED ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleFacingMode}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-full transition-colors flex items-center gap-1 text-xs"
            title="Switch Camera (Front / Rear)"
          >
            <SwitchCamera className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px] font-mono">{facingMode === 'environment' ? 'Back' : 'Front'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-full transition-colors"
            title="Close Camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Camera Viewfinder View */}
      <div className="relative w-full max-w-lg flex-1 my-4 flex items-center justify-center rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl">
        
        {cameraLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 z-10 bg-slate-950">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
            <span className="text-xs font-mono font-bold">Activating device camera...</span>
          </div>
        )}

        {error ? (
          <div className="p-6 text-center space-y-3 z-10 max-w-xs">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <div className="text-sm font-bold text-white">Camera Access Error</div>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
            >
              Retry Camera Access
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Tactical HUD Overlay Target Reticle */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
              <div className="w-full flex justify-between text-[10px] font-mono text-white/60 tracking-wider">
                <span>ISO AUTO</span>
                <span>GEOTAG ACTIVE</span>
              </div>

              <div className="w-48 h-48 border-2 border-red-500/40 rounded-2xl relative flex items-center justify-center">
                <div className="w-3 h-3 bg-red-500/60 rounded-full" />
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-red-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-red-500" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-red-500" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-red-500" />
              </div>

              <div className="text-center">
                <span className="px-3 py-1 bg-black/60 backdrop-blur rounded-full text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                  LIVE SENSOR FEED • ALIGN DISASTER EVIDENCE
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Shutter Action Zone */}
      <div className="w-full max-w-lg flex flex-col items-center gap-3 z-10">
        <button
          type="button"
          onClick={handleSnapPhoto}
          disabled={cameraLoading || !!error}
          className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white border-4 border-white shadow-[0_0_30px_rgba(239,68,68,0.7)] flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none"
          title="Snap Live Photo"
        >
          <div className="w-14 h-14 rounded-full border-2 border-white/50 flex items-center justify-center">
            <Camera className="w-7 h-7" />
          </div>
        </button>
        <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
          Snap Live Photo
        </span>
      </div>

    </div>
  );
};
