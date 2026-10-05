export type Language = 'en' | 'hi' | 'mr';

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    mr: string;
  };
}

export const translations: Translations = {
  // Brand & Header
  appTitle: {
    en: 'ResQIntel AI',
    hi: 'रेस्क्यूइंटेल एआई',
    mr: 'रेस्क्यूइंटेल एआय',
  },
  appTagline: {
    en: 'Emergency Response Intelligence Platform',
    hi: 'आपत्कालीन प्रतिसाद बुद्धिमत्ता मंच',
    mr: 'आपत्कालीन प्रतिसाद बुद्धिमत्ता व्यासपीठ',
  },
  appMission: {
    en: 'From scattered emergency signals to coordinated action.',
    hi: 'बिखरे हुए आपातकालीन संकेतों से समन्वित कार्रवाई तक।',
    mr: 'विखुरलेल्या आपत्कालीन संकेतांपासून समन्वित कृतीपर्यंत.',
  },
  govtHeader: {
    en: 'National Emergency Operations & Public Safety Command',
    hi: 'राष्ट्रीय आपातकालीन संचालन एवं लोक सुरक्षा कमान',
    mr: 'राष्ट्रीय आपत्कालीन ऑपरेशन्स आणि सार्वजनिक सुरक्षा कमांड',
  },

  // Navigation
  navCommandCenter: {
    en: 'Command Center',
    hi: 'कमांड सेंटर',
    mr: 'कमांड सेंटर',
  },
  navLiveMap: {
    en: 'Live GIS Map',
    hi: 'लाइव जीआईएस मैप',
    mr: 'थेट जीआयएस नकाशा',
  },
  navResources: {
    en: 'Fleet & Resources',
    hi: 'संसाधन एवं बेड़ा',
    mr: 'संसाधने व ताफा',
  },
  navFieldDuty: {
    en: 'Field Duty',
    hi: 'फील्ड ड्यूटी',
    mr: 'फील्ड ड्युटी',
  },
  navAnalytics: {
    en: 'SITREP & Analytics',
    hi: 'सिटरेप और विश्लेषण',
    mr: 'सिटरेप आणि विश्लेषण',
  },
  navDataSources: {
    en: 'Intelligence Sources',
    hi: 'सूचना स्रोत',
    mr: 'माहिती स्रोत',
  },
  navAdmin: {
    en: 'Admin & Audit',
    hi: 'प्रशासन एवं ऑडिट',
    mr: 'प्रशासन आणि ऑडिट',
  },
  navCitizenPortal: {
    en: 'Citizen Portal',
    hi: 'नागरिक पोर्टल',
    mr: 'नागरिक पोर्टल',
  },
  navDisasterMode: {
    en: 'Disaster / Flood SOS',
    hi: 'आपदा / बाढ़ एसओएस',
    mr: 'आपत्ती / पूर एसओएस',
  },
  navReportForm: {
    en: 'File Report',
    hi: 'रिपोर्ट दर्ज करें',
    mr: 'तक्रार नोंदवा',
  },
  navSystemHealth: {
    en: 'System Health',
    hi: 'सिस्टम स्वास्थ्य',
    mr: 'सिस्टम आरोग्य',
  },
  navNotifications: {
    en: 'Notifications',
    hi: 'अधिसूचनाएं',
    mr: 'सूचना',
  },
  navCopilot: {
    en: 'AI Copilot',
    hi: 'एआई कोपायलट',
    mr: 'एआय कोपायलट',
  },
  navSignOut: {
    en: 'Sign Out',
    hi: 'साइन आउट',
    mr: 'साइन आउट',
  },
  navSignIn: {
    en: 'Sign In',
    hi: 'साइन इन',
    mr: 'साइन इन',
  },

  // Roles
  roleDispatcher: {
    en: 'DISPATCHER',
    hi: 'नियंत्रक (डिस्पैचर)',
    mr: 'नियंत्रक (डिस्पॅचर)',
  },
  roleResponder: {
    en: 'RESPONDER',
    hi: 'बचावकर्मी',
    mr: 'बचाव पथक',
  },
  roleAnalyst: {
    en: 'ANALYST',
    hi: 'विश्लेषक',
    mr: 'विश्लेषक',
  },
  roleAdmin: {
    en: 'ADMIN',
    hi: 'प्रशासक',
    mr: 'प्रशासक',
  },
  roleCitizen: {
    en: 'CITIZEN',
    hi: 'नागरिक',
    mr: 'नागरिक',
  },

  // Statuses
  statusReported: {
    en: 'REPORTED',
    hi: 'दर्ज किया गया',
    mr: 'नोंदवले',
  },
  statusPendingVerification: {
    en: 'PENDING VERIFICATION',
    hi: 'सत्यापन लंबित',
    mr: 'पडताळणी प्रलंबित',
  },
  statusVerified: {
    en: 'VERIFIED',
    hi: 'सत्यापित',
    mr: 'पडताळलेले',
  },
  statusDispatched: {
    en: 'DISPATCHED',
    hi: 'तैनात किया गया',
    mr: 'रवाना केले',
  },
  statusEnRoute: {
    en: 'EN ROUTE',
    hi: 'मार्ग में',
    mr: 'मार्गावर',
  },
  statusOnScene: {
    en: 'ON SCENE',
    hi: 'घटनास्थल पर',
    mr: 'घटनास्थळी',
  },
  statusResolved: {
    en: 'RESOLVED',
    hi: 'सुलझाया गया',
    mr: 'निकाली काढले',
  },
  statusClosed: {
    en: 'CLOSED',
    hi: 'बंद',
    mr: 'बंद',
  },

  // Severities
  sevCritical: {
    en: 'CRITICAL',
    hi: 'अति गंभीर',
    mr: 'अति गंभीर',
  },
  sevHigh: {
    en: 'HIGH',
    hi: 'उच्च',
    mr: 'उच्च',
  },
  sevMedium: {
    en: 'MEDIUM',
    hi: 'मध्यम',
    mr: 'मध्यम',
  },
  sevLow: {
    en: 'LOW',
    hi: 'निम्न',
    mr: 'कमी',
  },

  // Operational Dashboard KPI Cards
  kpiActiveIncidents: {
    en: 'Active Incidents',
    hi: 'सक्रिय घटनाएं',
    mr: 'सक्रिय घटना',
  },
  kpiCriticalThreats: {
    en: 'Critical Threats',
    hi: 'अति गंभीर खतरे',
    mr: 'अति गंभीर धोके',
  },
  kpiPendingVerification: {
    en: 'Pending Verification',
    hi: 'सत्यापन प्रतीक्षारत',
    mr: 'पडताळणी प्रलंबित',
  },
  kpiAvailableFleet: {
    en: 'Fleet Available',
    hi: 'उपलब्ध वाहन बेड़ा',
    mr: 'उपलब्ध वाहने',
  },
  kpiPeopleAffected: {
    en: 'Civilians Affected',
    hi: 'प्रभावित नागरिक',
    mr: 'बाधित नागरिक',
  },

  // Common Actions & Buttons
  btnRefresh: {
    en: 'Refresh Telemetry',
    hi: 'डेटा रीफ्रेश करें',
    mr: 'डेटा रीफ्रेश करा',
  },
  btnAssignUnit: {
    en: 'Assign Unit',
    hi: 'इकाई नियुक्त करें',
    mr: 'पथक नियुक्त करा',
  },
  btnVerify: {
    en: 'Verify Incident',
    hi: 'घटना सत्यापित करें',
    mr: 'घटना पडताळा',
  },
  btnViewDossier: {
    en: 'Incident Dossier',
    hi: 'घटना विवरण',
    mr: 'घटना तपशील',
  },
  btnTriggerSOS: {
    en: 'PRESS FOR SOS',
    hi: 'आपातकालीन एसओएस दबाएं',
    mr: 'आपत्कालीन एसओएस दाबा',
  },
  btnCapturePhoto: {
    en: 'CAPTURE LIVE PHOTO',
    hi: 'लाइव फोटो खींचें',
    mr: 'थेट फोटो काढा',
  },
  btnVoiceSOS: {
    en: 'VOICE SOS NOTE',
    hi: 'आवाज एसओएस रिकॉर्ड करें',
    mr: 'व्हॉइस एसओएस रेकॉर्ड करा',
  },
  btnSubmitReport: {
    en: 'SUBMIT EMERGENCY REPORT',
    hi: 'आपातकालीन रिपोर्ट भेजें',
    mr: 'आपत्कालीन अहवाल सादर करा',
  },
  btnScanFeeds: {
    en: 'Run Proactive Agent Scan',
    hi: 'स्वायत्त स्थिति स्कैन चलाएं',
    mr: 'स्वायत्त परिस्थिती स्कॅन चालवा',
  },

  // Situation Intelligence & Weather
  tabIncidentQueue: {
    en: 'Active Incident Queue',
    hi: 'सक्रिय घटना सूची',
    mr: 'सक्रिय घटना यादी',
  },
  tabSituationIntel: {
    en: 'Situation Intelligence & External Signals (USGS / GDACS / Weather)',
    hi: 'स्थिति आसूचना एवं बाहरी संकेत (USGS / GDACS / मौसम)',
    mr: 'परिस्थिती बुद्धिमत्ता आणि बाह्य संकेत (USGS / GDACS / हवामान)',
  },
  lblLiveWeather: {
    en: 'Live Open-Meteo Telemetry',
    hi: 'लाइव मौसम माप (Open-Meteo)',
    mr: 'थेट हवामान निरीक्षण (Open-Meteo)',
  },
  lblThreatSynthesis: {
    en: 'Multi-Agent Threat Synthesis',
    hi: 'मल्टी-एजेंट खतरा विश्लेषण',
    mr: 'मल्टी-एजंट धोका विश्लेषण',
  },
  lblExternalSignals: {
    en: 'Ingested External Signals (USGS, GDACS, Regional RSS)',
    hi: 'प्राप्त बाहरी संकेत (USGS, GDACS, मौसम, समाचार)',
    mr: 'प्राप्त बाह्य संकेत (USGS, GDACS, हवामान, बातम्या)',
  },

  // Offline / Connectivity
  statusOnline: {
    en: 'ONLINE',
    hi: 'ऑनलाइन',
    mr: 'ऑनलाइन',
  },
  statusOffline: {
    en: 'OFFLINE — Auto-syncing queue active',
    hi: 'ऑफलाइन — स्वतः सिंक कतार सक्रिय',
    mr: 'ऑफलाइन — स्वयं सिंक रांग सक्रिय',
  },
  statusWeakNet: {
    en: 'LOW-BANDWIDTH MODE',
    hi: 'धीमा नेटवर्क मोड',
    mr: 'मंद नेटवर्क मोड',
  },

  // Filters & Search
  searchPlaceholder: {
    en: 'Search by incident #, title, or address...',
    hi: 'घटना संख्या, शीर्षक या पते से खोजें...',
    mr: 'घटना क्र., शीर्षक किंवा पत्त्यावरून शोधा...',
  },
  filterAllSeverities: {
    en: 'All Severities',
    hi: 'सभी गंभीरता स्तर',
    mr: 'सर्व गंभीरता स्तर',
  },
  filterAllStatuses: {
    en: 'All Operational Statuses',
    hi: 'सभी परिचालन स्थितियां',
    mr: 'सर्व ऑपरेशनल स्थिती',
  },
  filterAllTypes: {
    en: 'All Hazard Types',
    hi: 'सभी आपदा प्रकार',
    mr: 'सर्व आपत्ती प्रकार',
  },

  // Table Columns
  colRef: {
    en: 'Ref #',
    hi: 'संदर्भ सं.',
    mr: 'संदर्भ क्र.',
  },
  colTitleLocation: {
    en: 'Title & Location',
    hi: 'शीर्षक एवं स्थान',
    mr: 'शीर्षक आणि स्थान',
  },
  colHazardType: {
    en: 'Hazard Type',
    hi: 'आपदा प्रकार',
    mr: 'आपत्ती प्रकार',
  },
  colSeverity: {
    en: 'Severity',
    hi: 'गंभीरता',
    mr: 'गंभीरता',
  },
  colStatus: {
    en: 'Status',
    hi: 'स्थिति',
    mr: 'स्थिती',
  },
  colVerification: {
    en: 'Verification',
    hi: 'सत्यापन',
    mr: 'पडताळणी',
  },
  colActions: {
    en: 'Operational Actions',
    hi: 'कार्रवाई',
    mr: 'कृती',
  },

  // Executive Operational Dashboard Specific Keys
  dashActiveIncidents: {
    en: 'ACTIVE INCIDENTS',
    hi: 'सक्रिय घटनाएं',
    mr: 'सक्रिय घटना',
  },
  dashCriticalThreats: {
    en: 'CRITICAL THREATS',
    hi: 'अति गंभीर खतरे',
    mr: 'अति गंभीर धोके',
  },
  dashRespondersAvailable: {
    en: 'RESPONDERS AVAILABLE',
    hi: 'उपलब्ध बचावकर्मी',
    mr: 'उपलब्ध बचाव पथके',
  },
  dashPeopleAffected: {
    en: 'PEOPLE AFFECTED',
    hi: 'प्रभावित नागरिक',
    mr: 'बाधित नागरिक',
  },
  dashLiveSituationMap: {
    en: 'LIVE SITUATION MAP',
    hi: 'लाइव स्थिति मानचित्र',
    mr: 'थेट परिस्थिती नकाशा',
  },
  dashPriorityIncidents: {
    en: 'PRIORITY INCIDENTS',
    hi: 'प्राथमिकता वाली घटनाएं',
    mr: 'प्राधान्य घटना',
  },
  dashRecentActivity: {
    en: 'RECENT OPERATIONAL ACTIVITY',
    hi: 'हाल की परिचालन गतिविधि',
    mr: 'अलीकडील ऑपरेशनल हालचाली',
  },
  dashAiPriorityInsight: {
    en: 'AI PRIORITY INSIGHT',
    hi: 'एआई प्राथमिकता अंतर्दृष्टि',
    mr: 'एआय प्राधान्य इनसाइट',
  },
  dashSituationAlert: {
    en: 'SITUATION ALERT',
    hi: 'स्थिति चेतावनी',
    mr: 'परिस्थिती सतर्कता',
  },
  dashViewIncident: {
    en: 'View Incident',
    hi: 'घटना देखें',
    mr: 'घटना पहा',
  },
  dashViewAnalysis: {
    en: 'View Analysis',
    hi: 'विश्लेषण देखें',
    mr: 'विश्लेषण पहा',
  },
  dashViewSituationIntel: {
    en: 'View Situation Intelligence',
    hi: 'स्थिति आसूचना देखें',
    mr: 'परिस्थिती बुद्धिमत्ता पहा',
  },
  dashNoPriorityIncidents: {
    en: 'No urgent or critical incidents requiring immediate intervention.',
    hi: 'तत्काल हस्तक्षेप की आवश्यकता वाली कोई गंभीर घटना नहीं है।',
    mr: 'तातडीने हस्तक्षेप आवश्यक असलेली कोणतीही गंभीर घटना नाही.',
  },
  dashNoRecentActivity: {
    en: 'Awaiting new emergency signals or field status updates.',
    hi: 'नए आपातकालीन संकेतों या फील्ड अपडेट की प्रतीक्षा है।',
    mr: 'नवीन आपत्कालीन संकेत किंवा फील्ड अपडेटची प्रतीक्षा आहे.',
  }
};
