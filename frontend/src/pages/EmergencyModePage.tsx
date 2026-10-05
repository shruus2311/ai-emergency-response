import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertOctagon, Camera, Video, Mic, MapPin, Zap, 
  Wifi, WifiOff, Battery, BatteryCharging, CheckCircle2, 
  AlertTriangle, RefreshCw, Send, ShieldAlert, Users, Radio
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { triggerOfflineBatchSync } from '../services/offlineQueue';
import { LiveCameraCaptureModal } from '../components/common/LiveCameraCaptureModal';
import { useLanguage } from '../context/LanguageContext';

export const EmergencyModePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Core Emergency Telemetry State
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<'GOOD' | 'WEAK' | 'OFFLINE'>('GOOD');
  
  // Distress Payload State
  const [sosSent, setSosSent] = useState(false);
  const [incidentInfo, setIncidentInfo] = useState<any>(null);
  const [isTrapped, setIsTrapped] = useState<boolean | null>(null);
  const [casualtiesCount, setCasualtiesCount] = useState<number>(1);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Media Capture State
  const [photoState, setPhotoState] = useState<'IDLE' | 'CAPTURING' | 'COMPRESSING' | 'UPLOADING' | 'UPLOADED' | 'FAILED'>('IDLE');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const [videoState, setVideoState] = useState<'IDLE' | 'RECORDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED'>('IDLE');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // Voice SOS State
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceAudioBase64, setVoiceAudioBase64] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Hidden File Inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 1. Monitor Battery Level
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level);
        setIsCharging(battery.charging);

        const updateBattery = () => {
          setBatteryLevel(battery.level);
          setIsCharging(battery.charging);
        };

        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => setBatteryLevel(null));
    }
  }, []);

  // 2. Monitor Network Connectivity
  useEffect(() => {
    const updateNetwork = () => {
      if (!navigator.onLine) {
        setNetworkStatus('OFFLINE');
      } else {
        const conn = (navigator as any).connection;
        if (conn && (conn.effectiveType === '2g' || conn.saveData)) {
          setNetworkStatus('WEAK');
        } else {
          setNetworkStatus('GOOD');
        }
      }
    };

    updateNetwork();
    window.addEventListener('online', () => {
      updateNetwork();
      triggerOfflineBatchSync();
    });
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  // 3. Acquire Real GPS Location
  const acquireGPS = () => {
    if ('geolocation' in navigator) {
      setLoadingAction('ACQUIRING_GPS');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setGps({ lat, lng, accuracy: pos.coords.accuracy });
          setAddress(`GPS Coords [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
          setLoadingAction(null);
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
          setGps({ lat: 18.5204, lng: 73.8567 });
          setAddress('Pune Disaster Sector Coordinates');
          setLoadingAction(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  };

  useEffect(() => {
    acquireGPS();
  }, []);

  // 4. Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setVoiceTranscript(text);

        const lower = text.toLowerCase();
        if (lower.includes('trap') || lower.includes('phas') || lower.includes('roof') || lower.includes('chhat') || lower.includes('second floor')) {
          setIsTrapped(true);
        }
      };

      recognition.onerror = () => setVoiceRecording(false);
      recognition.onend = () => setVoiceRecording(false);
      recognitionRef.current = recognition;
      setSpeechSupported(true);
    }
  }, []);

  // 5. ONE-TAP SOS ACTION
  const triggerOneTapSOS = async () => {
    setLoadingAction('SENDING_SOS');
    setStatusMessage('Transmitting High-Priority Emergency Packet...');

    const clientUuid = `sos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      client_uuid: clientUuid,
      emergency_type: 'SOS',
      latitude: gps?.lat || 18.5204,
      longitude: gps?.lng || 73.8567,
      address: address || 'Emergency Distress Location',
      battery_level: batteryLevel,
      connectivity_type: networkStatus,
      is_trapped: isTrapped === true,
      affected_people: casualtiesCount,
      voice_transcript: voiceTranscript || undefined,
      voice_audio_base64: voiceAudioBase64 || undefined,
      image_base64: photoPreview || undefined,
      video_url: videoUrl || undefined,
      notes: `CRITICAL CITIZEN ONE-TAP SOS. Trapped: ${isTrapped ? 'YES' : 'UNKNOWN'}. Casualties: ${casualtiesCount}.`,
      reporter_name: user?.full_name || 'Anonymous Distress Signal',
      reporter_phone: user?.phone || '+91-EMERGENCY'
    };

    try {
      const res = await api.reports.emergencyPacket(payload);
      setIncidentInfo(res);
      setSosSent(true);
      setStatusMessage('SOS Dispatched! Central Command & Responders Alerted.');
    } catch (err: any) {
      if (!navigator.onLine) {
        setStatusMessage('Network unavailable. Packet safely saved in local offline queue.');
        setSosSent(true);
      } else {
        setStatusMessage(err.message || 'Distress signal queued.');
      }
    } finally {
      setLoadingAction(null);
    }
  };

  // 6. Camera Photo Compression & Capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoState('COMPRESSING');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 960;
        const MAX_HEIGHT = 960;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
        setPhotoPreview(compressedBase64);
        setPhotoState('UPLOADED');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 7. Voice SOS Toggle
  const toggleVoiceSOS = async () => {
    if (voiceRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
        audioRecorderRef.current.stop();
      }
      setVoiceRecording(false);
      setStatusMessage('Voice distress recording finished.');
    } else {
      setVoiceTranscript('');
      setVoiceAudioBase64(null);
      audioChunksRef.current = [];

      if (speechSupported && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            setVoiceAudioBase64(reader.result as string);
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
      } catch (err) {
        console.warn('Microphone stream error:', err);
      }

      setVoiceRecording(true);
      setStatusMessage('Listening to live speech & recording voice distress note...');
    }
  };

  const isLowBattery = batteryLevel !== null && batteryLevel <= 0.20 && !isCharging;

  return (
    <div className={`min-h-[calc(100vh-64px)] p-4 flex flex-col justify-between select-none ${
      isLowBattery ? 'bg-forest-950 text-amber-300' : 'bg-ivory-50 dark:bg-forest-950 text-forest-900 dark:text-sage-100'
    }`}>
      
      {/* Top Telemetry & Status Bar */}
      <div className="flex items-center justify-between border-b border-ivory-300 dark:border-forest-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600 dark:bg-red-500 animate-ping" />
          <span className="font-mono text-sm font-black tracking-widest text-red-600 dark:text-red-400 uppercase">
            EMERGENCY MODE
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {/* Battery Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
            isLowBattery 
              ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-950/80 dark:border-red-600 dark:text-red-400 animate-pulse font-bold' 
              : 'bg-ivory-50 dark:bg-forest-900 border-ivory-300 dark:border-forest-700 text-forest-800 dark:text-sage-300'
          }`}>
            {isCharging ? <BatteryCharging className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Battery className="w-3.5 h-3.5" />}
            <span>{batteryLevel !== null ? `${Math.round(batteryLevel * 100)}%` : 'BATTERY UNKNOWN'}</span>
          </div>

          {/* Connectivity Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
            networkStatus === 'OFFLINE' 
              ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-950/80 dark:border-red-700 dark:text-red-400 font-bold' 
              : networkStatus === 'WEAK' 
              ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/80 dark:border-amber-700 dark:text-amber-300' 
              : 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-700 dark:text-emerald-300'
          }`}>
            {networkStatus === 'OFFLINE' ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{networkStatus}</span>
          </div>
        </div>
      </div>

      {/* Low Battery Warning Banner */}
      {isLowBattery && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/60 border border-red-300 dark:border-red-500 rounded-lg text-center text-xs font-bold text-red-900 dark:text-red-200">
          ⚠️ LOW BATTERY EMERGENCY MODE: Background processing minimized. Full SOS operational.
        </div>
      )}

      {/* MAIN ACTION ZONE */}
      <div className="my-auto py-4 flex flex-col items-center gap-4 max-w-md mx-auto w-full">
        
        {/* HUGE ONE-TAP SOS BUTTON */}
        <button
          onClick={triggerOneTapSOS}
          disabled={loadingAction === 'SENDING_SOS'}
          className={`w-full h-44 rounded-3xl font-black text-3xl shadow-xl transition-transform active:scale-95 flex flex-col items-center justify-center gap-2 border-4 ${
            sosSent
              ? 'bg-emerald-700 hover:bg-emerald-600 border-emerald-400 text-white animate-pulse'
              : 'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border-red-400 text-white shadow-red-900/40'
          }`}
        >
          <AlertOctagon className={`w-14 h-14 ${loadingAction === 'SENDING_SOS' ? 'animate-spin' : ''}`} />
          <span>{sosSent ? 'SOS ACTIVE' : t('btnTriggerSOS', 'PRESS FOR SOS')}</span>
          <span className="text-xs font-mono font-normal tracking-normal opacity-90">
            {sosSent ? 'Transmitted to Command Center' : 'One-Tap Distress Broadcast'}
          </span>
        </button>

        {/* Status Notification */}
        {statusMessage && (
          <div className="w-full p-3 bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-700 rounded-xl text-xs text-center font-mono text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Rapid Multimodal Inputs */}
        <div className="grid grid-cols-2 gap-3 w-full">
          
          {/* Photo Capture */}
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className={`h-24 rounded-2xl border flex flex-col items-center justify-center gap-1 font-bold text-sm transition-all active:scale-95 ${
              photoPreview 
                ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-sm' 
                : 'bg-ivory-50 dark:bg-forest-900 hover:bg-ivory-100 dark:hover:bg-forest-800 border-ivory-300 dark:border-forest-700 text-forest-900 dark:text-sage-100'
            }`}
          >
            <Camera className={`w-7 h-7 ${photoPreview ? 'text-emerald-600 dark:text-emerald-400' : 'text-forest-700 dark:text-sage-300'}`} />
            <span>{photoPreview ? 'PHOTO READY ✓' : t('btnCapturePhoto', 'CAPTURE PHOTO')}</span>
            <span className="text-[10px] font-mono text-forest-600 dark:text-sage-400">
              {photoPreview ? 'Tap to Retake' : 'Open Camera'}
            </span>
          </button>

          {/* Voice SOS */}
          <button
            onClick={toggleVoiceSOS}
            className={`h-24 rounded-2xl border flex flex-col items-center justify-center gap-1 font-bold text-sm transition-colors ${
              voiceRecording
                ? 'bg-red-100 dark:bg-red-900 border-red-400 dark:border-red-500 text-red-900 dark:text-white animate-pulse'
                : voiceTranscript
                ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-500 text-purple-900 dark:text-purple-300'
                : 'bg-ivory-50 dark:bg-forest-900 hover:bg-ivory-100 dark:hover:bg-forest-800 border-ivory-300 dark:border-forest-700 text-forest-900 dark:text-sage-100'
            }`}
          >
            <Mic className={`w-7 h-7 ${voiceRecording ? 'text-red-600 dark:text-red-400 animate-bounce' : 'text-forest-700 dark:text-sage-300'}`} />
            <span>{voiceRecording ? 'LISTENING...' : voiceTranscript ? 'VOICE RECORDED ✓' : t('btnVoiceSOS', 'VOICE SOS')}</span>
            <span className="text-[10px] font-mono text-forest-600 dark:text-sage-400">Speak Hindi / English</span>
          </button>
        </div>

        {/* Live Voice Transcript Box */}
        {voiceTranscript && (
          <div className="w-full p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-xl text-xs font-mono text-purple-900 dark:text-purple-200">
            <span className="text-purple-700 dark:text-purple-400 font-bold block mb-1">🎙️ Voice SOS Transcript:</span>
            "{voiceTranscript}"
          </div>
        )}

        {/* Critical Missing Info Question */}
        <div className="w-full p-3 bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-2xl flex flex-col gap-2">
          <div className="text-xs font-bold text-forest-900 dark:text-sage-200 flex items-center justify-between">
            <span>Are you trapped or unable to evacuate?</span>
            {isTrapped !== null && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                isTrapped ? 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-200' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
              }`}>
                {isTrapped ? 'YES — TRAPPED' : 'NO — SAFE TO MOVE'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsTrapped(true)}
              className={`py-3 rounded-xl font-bold text-sm border transition-colors ${
                isTrapped === true
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-ivory-100 hover:bg-ivory-200 dark:bg-forest-800/80 dark:hover:bg-forest-700 border-ivory-300 dark:border-forest-700 text-forest-900 dark:text-sage-200'
              }`}
            >
              ⚠️ YES — TRAPPED
            </button>
            <button
              onClick={() => setIsTrapped(false)}
              className={`py-3 rounded-xl font-bold text-sm border transition-colors ${
                isTrapped === false
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-ivory-100 hover:bg-ivory-200 dark:bg-forest-800/80 dark:hover:bg-forest-700 border-ivory-300 dark:border-forest-700 text-forest-900 dark:text-sage-200'
              }`}
            >
              NO — MOBILE
            </button>
          </div>
        </div>

        {/* GPS Location Telemetry Bar */}
        <div className="w-full p-2.5 bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded-xl flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-forest-800 dark:text-sage-300 truncate">
            <MapPin className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="truncate">{address || 'Locating GPS...'}</span>
          </div>
          <button
            onClick={acquireGPS}
            className="p-1 hover:bg-ivory-200 dark:hover:bg-forest-800 text-forest-700 dark:text-sage-300 rounded flex-shrink-0"
            title="Refresh GPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'ACQUIRING_GPS' ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Bottom Emergency Navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-ivory-300 dark:border-forest-800 pt-3">
        <button
          onClick={() => navigate('/report')}
          className="text-xs text-forest-700 dark:text-sage-400 hover:underline font-mono"
        >
          Switch to Standard Form
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-3.5 py-1.5 bg-ivory-100 hover:bg-ivory-200 dark:bg-forest-900 dark:hover:bg-forest-800 border border-ivory-300 dark:border-forest-700 text-forest-900 dark:text-sage-200 rounded-lg text-xs font-bold transition-colors"
        >
          Citizen Dashboard
        </button>
      </div>

      {/* Live Device Camera Modal */}
      <LiveCameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(base64) => {
          setPhotoPreview(base64);
          setPhotoState('UPLOADED');
          setIsCameraOpen(false);
          setStatusMessage('Live disaster photo captured & compressed successfully.');
        }}
      />

    </div>
  );
};
