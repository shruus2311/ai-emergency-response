import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Mic, MicOff, Camera, MapPin, Upload, 
  CheckCircle, AlertCircle, Loader2, Sparkles, Navigation,
  Video
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { LiveCameraCaptureModal } from '../components/common/LiveCameraCaptureModal';

export const ReportEmergencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Form states
  const [incidentType, setIncidentType] = useState('Flood');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number>(13.0827);
  const [longitude, setLongitude] = useState<number>(80.2707);
  const [address, setAddress] = useState('River Road near Central Bridge Crossing');
  const [injuries, setInjuries] = useState<number>(0);
  const [peopleAffected, setPeopleAffected] = useState<number>(5);
  const [hazards, setHazards] = useState('');
  const [damage, setDamage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitterName, setSubmitterName] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Media upload & live camera
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);

  // Submission state & AI result
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [error, setError] = useState('');

  // GPS auto-capture
  const handleCaptureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          try {
            const geo = await api.map.reverseGeocode(lat, lng);
            if (geo && geo.address) setAddress(geo.address);
          } catch {
            setAddress(`Coordinates [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
          }
        },
        () => {
          setError(t('gpsError', 'Unable to retrieve device GPS. Please pinpoint your location on the map.'));
        }
      );
    }
  };

  // Map pin select
  const handleMapPin = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    try {
      const geo = await api.map.reverseGeocode(lat, lng);
      if (geo && geo.address) setAddress(geo.address);
    } catch {
      setAddress(`Coordinates [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
    }
  };

  // Voice recording toggle with Browser Web Speech API fallback
  const recognitionRef = React.useRef<any>(null);
  const [voiceStatus, setVoiceStatus] = useState<string>('');

  const startRecording = async () => {
    setVoiceStatus('');
    try {
      // 1. Try Browser SpeechRecognition for immediate client-side real-time capture
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setVoiceTranscript(currentTranscript.trim());
            setDescription((prev) => (prev ? `${prev} ${currentTranscript.trim()}` : currentTranscript.trim()));
            setVoiceStatus('Captured via Browser Speech Recognition');
          }
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      // 2. Stream audio bytes for server-side ingestion
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        try {
          const res = await api.reports.transcribe(audioBlob);
          if (res && (res.status === 'REAL_TRANSCRIPTION' || res.status === 'REAL_INFERENCE') && res.transcript) {
            setVoiceTranscript(res.transcript);
            setDescription((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
            setVoiceStatus(`Transcribed via ${res.provider || 'faster-whisper'}`);
          } else if (res && res.status === 'CONFIGURATION_REQUIRED') {
            setVoiceStatus('Audio recording attached. Server-side Whisper transcription requires local model or speech provider.');
          }
        } catch (err: any) {
          setVoiceStatus('Audio recorded. Automated server transcription requires configured speech provider.');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setVoiceStatus('Microphone access denied or unavailable in this browser session. Please enter distress report text manually.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  // Photo upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    setError('');
    try {
      const res = await api.reports.upload(file);
      setMediaUrls((prev) => [...prev, res.file_url]);
    } catch (err: any) {
      setError(`Failed to upload media: ${err.message || 'Server error'}`);
    } finally {
      setUploadingMedia(false);
    }
  };

  // Submit report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t('descRequired', 'Please provide a description or voice note of the emergency.'));
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      incident_type: incidentType,
      description,
      latitude,
      longitude,
      address,
      injuries_reported: Number(injuries),
      people_affected: Number(peopleAffected),
      hazards,
      damage,
      is_anonymous: isAnonymous,
      submitter_name: submitterName,
      submitter_phone: submitterPhone,
      voice_transcript: voiceTranscript,
      media_urls: mediaUrls,
    };

    try {
      const result = await api.reports.submit(payload);
      setAiResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit emergency report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 font-sans">
      
      {/* Title */}
      <div className="mb-6">
        <span className="text-xs font-mono font-bold text-forest-700 dark:text-sage-400 uppercase tracking-widest">
          {t('navCitizenPortal', 'Civilian Emergency Portal')}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-forest-950 dark:text-white flex items-center gap-2 mt-1">
          <ShieldAlert className="w-6 h-6 text-forest-700 dark:text-sage-300" />
          {t('reportEmergencyHeading', 'Report an Emergency Incident')}
        </h1>
        <p className="text-xs text-sage-800 dark:text-sage-400 mt-1 font-sans">
          {t('multimodalSignalsDesc', 'Multimodal signals (text, speech, live camera, GPS) are immediately correlated by the Multi-Agent AI pipeline.')}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-forest-900 border border-red-300 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Processing Success Modal / Card */}
      {aiResult ? (
        <div className="bg-ivory-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-700 rounded p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-forest-700 dark:text-sage-300">
            <CheckCircle className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-bold text-forest-950 dark:text-white ">{t('reportReceivedAnalyzed', 'Emergency Report Received & Analyzed')}</h2>
              <p className="text-xs text-sage-700 dark:text-sage-400">
                {t('tableRef', 'Incident Number')}: <span className="font-mono text-forest-950 dark:text-white font-bold">{aiResult.incident_number}</span>
              </p>
            </div>
          </div>

          <div className="p-4 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-ivory-300 dark:border-forest-800 pb-2">
              <span className="text-sage-600 dark:text-sage-400 font-mono">OPERATIONAL STATUS:</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-forest-850 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold uppercase tracking-wider">
                {t('statusPending', 'PENDING HUMAN VERIFICATION')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-sage-600 dark:text-sage-400">AI Classification:</span>
                <div className="text-sm font-bold text-forest-950 dark:text-white">
                  {aiResult.orchestration_summary?.classification?.prediction}
                </div>
              </div>
              <div>
                <span className="text-sage-600 dark:text-sage-400">Assessed Severity:</span>
                <div className="text-sm font-bold text-red-700 dark:text-red-400">
                  {aiResult.orchestration_summary?.severity?.severity_class} ({aiResult.orchestration_summary?.severity?.severity_score}/10)
                </div>
              </div>
            </div>

            <div className="text-sage-700 dark:text-sage-400 pt-2 border-t border-ivory-300 dark:border-forest-800">
              Clustering Correlation: <strong className="text-forest-950 dark:text-ivory-50">{aiResult.clustering_decision}</strong>. 
              Pipeline processed in {aiResult.orchestration_summary?.pipeline_time_ms} ms.
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/incidents/${aiResult.incident_id}`)}
              className="flex-1 py-2.5 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded font-bold text-xs shadow transition-colors"
            >
              {t('viewDossierMap', 'View Full Incident Dossier & Map')}
            </button>
            <button
              onClick={() => {
                setAiResult(null);
                setDescription('');
                setVoiceTranscript('');
              }}
              className="px-4 py-2.5 bg-ivory-200 dark:bg-forest-850 hover:bg-ivory-300 dark:hover:bg-forest-800 text-forest-900 dark:text-white rounded text-xs font-semibold border border-ivory-300 dark:border-forest-700 transition-colors"
            >
              {t('fileAnotherReport', 'File Another Report')}
            </button>
          </div>
        </div>
      ) : (
        /* Report Submission Form */
        <form onSubmit={handleSubmit} className="bg-ivory-100/90 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded p-6 sm:p-8 space-y-6 shadow-sm">
          
          {/* Emergency Type */}
          <div>
            <label className="block text-xs font-bold text-forest-900 dark:text-sage-300 uppercase tracking-wider mb-2">
              {t('tableHazard', 'Emergency Disaster Type')}
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-2 text-xs text-forest-950 dark:text-white focus:outline-none focus:border-forest-600"
            >
              <option value="Flood">Flood / Water Inundation</option>
              <option value="Fire">Fire & Smoke Plume</option>
              <option value="Building Collapse">Building Collapse / Structural Debris</option>
              <option value="Road Accident">Road Accident / Highway Collision</option>
              <option value="Landslide">Landslide & Mudflow</option>
              <option value="Earthquake">Earthquake Tremors & Structural Damage</option>
              <option value="Cyclone">Cyclone / Severe Gale Storm</option>
              <option value="Medical Emergency">Acute Medical Emergency / Mass Casualty</option>
              <option value="Industrial Accident">Industrial Hazard / Chemical Leak</option>
              <option value="Road Blockage">Road Blockage / Obstruction</option>
              <option value="Other">Other Urgent Emergency</option>
            </select>
          </div>

          {/* Text Description + Voice Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-forest-900 dark:text-sage-300 uppercase tracking-wider">
                {t('emergencyDesc', 'Emergency Situation Description')}
              </label>
              
              {/* Voice Record Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border transition-all ${
                  isRecording 
                    ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-500 animate-pulse' 
                    : 'bg-ivory-200 dark:bg-forest-850 hover:bg-ivory-300 dark:hover:bg-forest-800 text-forest-900 dark:text-sage-300 border-ivory-300 dark:border-forest-700'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5 text-red-600" /> : <Mic className="w-3.5 h-3.5 text-forest-700 dark:text-sage-400" />}
                <span>{isRecording ? t('stopRecording', 'Stop Recording') : t('voiceReport', 'Voice Note (Speech-to-Text)')}</span>
              </button>
            </div>

            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descPlaceholder', 'State what occurred, visible hazards, trapped people, and landmark references...')}
              className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded p-3 text-xs text-forest-950 dark:text-white placeholder-sage-500 focus:outline-none focus:border-forest-600 font-sans leading-relaxed"
            />

            {voiceTranscript && (
              <div className="mt-2 p-2 bg-sage-100 dark:bg-forest-850 border border-sage-300 dark:border-forest-700 rounded text-xs text-forest-900 dark:text-sage-200">
                <span className="font-bold text-[10px] text-forest-800 dark:text-sage-300 block font-mono">TRANSCRIBED VOICE NOTE:</span>
                "{voiceTranscript}"
              </div>
            )}

            {voiceStatus && (
              <div className="mt-1.5 p-2 bg-ivory-200 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded text-[11px] text-sage-700 dark:text-sage-400 font-mono">
                ℹ️ {voiceStatus}
              </div>
            )}
          </div>

          {/* Location Capture & Interactive Pin Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-forest-900 dark:text-sage-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-forest-700 dark:text-sage-300" />
                {t('incidentLocationPin', 'Incident GIS Location Pin')}
              </label>

              <button
                type="button"
                onClick={handleCaptureGPS}
                className="flex items-center gap-1 text-xs text-forest-800 dark:text-sage-300 hover:underline font-semibold"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{t('captureGPS', 'Capture GPS')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[11px] text-sage-600 dark:text-sage-400 font-mono mb-0.5">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={async (e) => {
                    const newLat = parseFloat(e.target.value) || 0;
                    setLatitude(newLat);
                    if (newLat && longitude) {
                      try {
                        const geo = await api.map.reverseGeocode(newLat, longitude);
                        if (geo && geo.address) setAddress(geo.address);
                      } catch {}
                    }
                  }}
                  placeholder="e.g. 18.5204"
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-1.5 text-xs text-forest-950 dark:text-white font-mono focus:outline-none focus:border-forest-600"
                />
              </div>
              <div>
                <label className="block text-[11px] text-sage-600 dark:text-sage-400 font-mono mb-0.5">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={async (e) => {
                    const newLng = parseFloat(e.target.value) || 0;
                    setLongitude(newLng);
                    if (latitude && newLng) {
                      try {
                        const geo = await api.map.reverseGeocode(latitude, newLng);
                        if (geo && geo.address) setAddress(geo.address);
                      } catch {}
                    }
                  }}
                  placeholder="e.g. 73.8567"
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-1.5 text-xs text-forest-950 dark:text-white font-mono focus:outline-none focus:border-forest-600"
                />
              </div>
            </div>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address or click map below to position marker"
              className="w-full mb-3 bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-2 text-xs text-forest-950 dark:text-white placeholder-sage-500 focus:outline-none focus:border-forest-600"
            />

            <div className="rounded overflow-hidden border border-ivory-300 dark:border-forest-800">
              <EmergencyMap
                center={[latitude, longitude]}
                zoom={14}
                selectableLocation={true}
                selectedLocation={[latitude, longitude]}
                onSelectLocation={handleMapPin}
                height="240px"
              />
            </div>
            <span className="text-[10px] text-sage-600 dark:text-sage-500 mt-1 block">
              Tip: Click anywhere on the map or type exact coordinates to position marker.
            </span>
          </div>

          {/* Impact Estimates & Casualties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-forest-900 dark:text-sage-300 mb-1">
                {t('estimatedPeopleAffected', 'Estimated People Affected / Trapped')}
              </label>
              <input
                type="number"
                min="0"
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(Number(e.target.value))}
                className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-2 text-xs text-forest-950 dark:text-white focus:outline-none focus:border-forest-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-forest-900 dark:text-sage-300 mb-1">
                {t('reportedInjuries', 'Reported Casualties / Injuries')}
              </label>
              <input
                type="number"
                min="0"
                value={injuries}
                onChange={(e) => setInjuries(Number(e.target.value))}
                className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-2 text-xs text-forest-950 dark:text-white focus:outline-none focus:border-forest-600"
              />
            </div>
          </div>

          {/* Secondary Hazards & Damage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-forest-900 dark:text-sage-300 mb-1">
                Secondary Hazards (e.g. live wire, gas leak)
              </label>
              <input
                type="text"
                value={hazards}
                onChange={(e) => setHazards(e.target.value)}
                placeholder="Downed live wires, rapid current..."
                className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-2 text-xs text-forest-950 dark:text-white placeholder-sage-500 focus:outline-none focus:border-forest-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-forest-900 dark:text-sage-300 mb-1">
                Infrastructure Damage (e.g. road blocked)
              </label>
              <input
                type="text"
                value={damage}
                onChange={(e) => setDamage(e.target.value)}
                placeholder="Bridge approach washed away..."
                className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-2 text-xs text-forest-950 dark:text-white placeholder-sage-500 focus:outline-none focus:border-forest-600"
              />
            </div>
          </div>

          {/* Photo Upload & Live Camera WebRTC */}
          <div>
            <label className="block text-xs font-bold text-forest-900 dark:text-sage-300 uppercase tracking-wider mb-2">
              {t('attachMedia', 'Attach Photographic / Live Camera Evidence')}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {/* Direct Live Camera Launch */}
              <button
                type="button"
                onClick={() => setShowLiveCamera(true)}
                className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded text-xs font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <Camera className="w-4 h-4 text-ivory-200" />
                <span>{t('captureLivePhoto', 'Capture Live Photo (Camera App)')}</span>
              </button>

              <label className="cursor-pointer px-4 py-2 bg-ivory-200 dark:bg-forest-850 hover:bg-ivory-300 dark:hover:bg-forest-800 text-forest-900 dark:text-white rounded text-xs font-medium border border-ivory-300 dark:border-forest-700 flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4 text-forest-700 dark:text-sage-300" />
                <span>{t('uploadMediaFile', 'Upload File')}</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadingMedia && <Loader2 className="w-4 h-4 animate-spin text-sage-500" />}
              {mediaUrls.length > 0 && (
                <span className="text-xs text-forest-700 dark:text-sage-300 font-mono font-semibold">
                  ✓ {mediaUrls.length} file(s) attached
                </span>
              )}
            </div>
          </div>

          {/* Submitter Info & Anonymous Option */}
          <div className="pt-4 border-t border-ivory-300 dark:border-forest-800">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="anon"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded bg-ivory-50 dark:bg-forest-950 border-ivory-300 dark:border-forest-800 text-forest-700 focus:ring-0"
              />
              <label htmlFor="anon" className="text-xs text-forest-900 dark:text-sage-300">
                {t('submitAnonymously', 'Submit this emergency report anonymously')}
              </label>
            </div>

            {!isAnonymous && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  className="bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-2 text-xs text-forest-950 dark:text-white placeholder-sage-500 focus:outline-none focus:border-forest-600"
                />
                <input
                  type="tel"
                  placeholder="Callback Phone Number"
                  value={submitterPhone}
                  onChange={(e) => setSubmitterPhone(e.target.value)}
                  className="bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-2 text-xs text-forest-950 dark:text-white placeholder-sage-500 focus:outline-none focus:border-forest-600"
                />
              </div>
            )}
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded font-medium text-sm shadow flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('runningAIPipeline', 'Running Multi-Agent AI Analysis Pipeline...')}</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 text-ivory-200" />
                <span>{t('submitReportButton', 'Submit Emergency Distress Report')}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Direct Live WebRTC Camera Modal */}
      {showLiveCamera && (
        <LiveCameraCaptureModal
          isOpen={showLiveCamera}
          onClose={() => setShowLiveCamera(false)}
          onCapture={(fileUrl) => {
            setMediaUrls((prev) => [...prev, fileUrl]);
          }}
        />
      )}

    </div>
  );
};
