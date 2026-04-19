"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { SessionContext } from "@/lib/ai/contracts";

type TranslationDict = Record<string, string>;

const EN_DICT: TranslationDict = {
  operations: "Operations",
  nodeNetwork: "Node Network",
  tagline:
    "UN-coordinated food aid routed through warehouses and local beacon nodes. Every hop is cryptographically anchored on Solana testnet at the moment of physical handoff.",
  driverConsole: "Driver console",
  nodes: "Nodes",
  inTransit: "In transit",
  delivered: "Delivered",
  flagged: "Flagged",
  liveNetworkMap: "Live network map",
  mapLegend:
    "Warehouses in blue · stores in green · homes in amber · dashed active routes · orange pins show live driver GPS.",
  mapLegendReadOnly:
    "Follow routes in real time. Hub nodes in blue, beacon nodes in green, active routes dashed, completed legs solid.",
  transparency: "Transparency",
  publicView: "Public view",
  publicTagline:
    "Read-only map and shipment progress. Custody updates still happen through verified field taps and UN operations.",
  shipments: "Shipments",
  pollingEvery: "polling every",
  coordinatorQuery: "Coordinator query",
  coordinatorHint:
    "Ask an operations question. Structured requests go directly to operational tools; Gemini is only used when reasoning or translation is needed.",
  askPlaceholder: "Ask about risk, recent activity, or a shipment by ID",
  runQuery: "Run query",
  language: "Language",
  loadingQuery: "Checking data...",
  responseLabel: "Response",
  voiceDelivery: "Voice delivery",
};

const DICTS: Record<string, TranslationDict> = {
  en: EN_DICT,
  es: {
    ...EN_DICT,
    operations: "Operaciones",
    nodeNetwork: "Red de nodos",
    driverConsole: "Consola del conductor",
    nodes: "Nodos",
    inTransit: "En transito",
    delivered: "Entregado",
    flagged: "Marcado",
    liveNetworkMap: "Mapa de red en vivo",
    shipments: "Envios",
    pollingEvery: "actualizando cada",
    coordinatorQuery: "Consulta del coordinador",
    coordinatorHint:
      "Haz una pregunta operativa. Las solicitudes estructuradas van directo a las herramientas; Gemini solo se usa cuando hace falta razonamiento o traduccion.",
    runQuery: "Ejecutar consulta",
    language: "Idioma",
    loadingQuery: "Consultando datos...",
    responseLabel: "Respuesta",
    voiceDelivery: "Entrega de voz",
  },
  fr: {
    ...EN_DICT,
    nodeNetwork: "Reseau de noeuds",
    driverConsole: "Console chauffeur",
    nodes: "Noeuds",
    delivered: "Livre",
    flagged: "Signale",
    shipments: "Expeditions",
    pollingEvery: "actualisation toutes les",
    coordinatorQuery: "Requete du coordinateur",
    coordinatorHint:
      "Posez une question operationnelle. Les demandes structurees vont directement aux outils; Gemini n'est utilise que pour le raisonnement ou la traduction.",
    runQuery: "Executer",
    language: "Langue",
    loadingQuery: "Verification des donnees...",
    responseLabel: "Reponse",
    voiceDelivery: "Diffusion vocale",
  },
  pt: {
    ...EN_DICT,
    operations: "Operacoes",
    nodeNetwork: "Rede de nos",
    driverConsole: "Console do motorista",
    nodes: "Nos",
    inTransit: "Em transito",
    delivered: "Entregue",
    flagged: "Sinalizado",
    shipments: "Remessas",
    pollingEvery: "atualizando a cada",
    coordinatorQuery: "Consulta do coordenador",
    coordinatorHint:
      "Faca uma pergunta operacional. Pedidos estruturados vao direto para as ferramentas; o Gemini so entra quando ha raciocinio ou traducao.",
    runQuery: "Executar consulta",
    language: "Idioma",
    loadingQuery: "Consultando dados...",
    responseLabel: "Resposta",
    voiceDelivery: "Entrega por voz",
  },
  de: {
    ...EN_DICT,
    operations: "Einsatzleitung",
    nodeNetwork: "Knotennetz",
    nodes: "Knoten",
    inTransit: "Unterwegs",
    delivered: "Geliefert",
    flagged: "Markiert",
    shipments: "Sendungen",
    coordinatorQuery: "Koordinator-Abfrage",
    coordinatorHint:
      "Stellen Sie eine operative Frage. Strukturierte Anfragen gehen direkt an die Werkzeuge; Gemini wird nur fur Schlussfolgerung oder Ubersetzung genutzt.",
    runQuery: "Abfrage starten",
    language: "Sprache",
    loadingQuery: "Daten werden gepruft...",
    responseLabel: "Antwort",
    voiceDelivery: "Sprachausgabe",
  },
  sw: {
    ...EN_DICT,
    operations: "Uendeshaji",
    nodeNetwork: "Mtandao wa nodi",
    driverConsole: "Dashibodi ya dereva",
    nodes: "Nodi",
    inTransit: "Safarini",
    delivered: "Imewasili",
    flagged: "Imetiwa alama",
    shipments: "Mizigo",
    coordinatorQuery: "Swali la mratibu",
    coordinatorHint:
      "Uliza swali la uendeshaji. Maombi yaliyo wazi huenda moja kwa moja kwenye zana; Gemini hutumika tu panapohitajika uchambuzi au tafsiri.",
    runQuery: "Endesha",
    language: "Lugha",
    loadingQuery: "Inachunguza taarifa...",
    responseLabel: "Jibu",
    voiceDelivery: "Uwasilishaji wa sauti",
  },
  hi: {
    ...EN_DICT,
    inTransit: "Safar mein",
    delivered: "Pahunch gaya",
    coordinatorHint:
      "Operations sawal poochhiye. Structured requests seedhe tools tak jati hain; Gemini sirf reasoning ya translation ke liye use hota hai.",
    language: "Bhasha",
    loadingQuery: "Data check ho raha hai...",
  },
  ar: {
    ...EN_DICT,
    operations: "العمليات",
    nodeNetwork: "شبكة العقد",
    driverConsole: "لوحة السائق",
    nodes: "العقد",
    inTransit: "قيد النقل",
    delivered: "تم التسليم",
    flagged: "تم وضع علامة",
    shipments: "الشحنات",
    coordinatorQuery: "استعلام المنسق",
    coordinatorHint:
      "اطرح سؤالا تشغيليا. الطلبات المنظمة تذهب مباشرة الى الادوات، ويستخدم Gemini فقط عند الحاجة الى الاستدلال او الترجمة.",
    runQuery: "تشغيل الاستعلام",
    language: "اللغة",
    loadingQuery: "جار فحص البيانات...",
    responseLabel: "الاستجابة",
    voiceDelivery: "التوصيل الصوتي",
  },
  uk: {
    ...EN_DICT,
    operations: "Операції",
    nodeNetwork: "Мережа вузлів",
    driverConsole: "Консоль водія",
    nodes: "Вузли",
    inTransit: "У дорозі",
    delivered: "Доставлено",
    flagged: "Позначено",
    shipments: "Відправлення",
    coordinatorQuery: "Запит координатора",
    coordinatorHint:
      "Поставте операційне запитання. Структуровані запити йдуть прямо до інструментів; Gemini використовується лише для міркувань або перекладу.",
    runQuery: "Виконати запит",
    language: "Мова",
    loadingQuery: "Перевірка даних...",
    responseLabel: "Відповідь",
    voiceDelivery: "Голосова доставка",
  },
};

type LanguageContextValue = SessionContext & {
  language: string;
  setLanguage: (language: string) => Promise<void>;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialSession,
  children,
}: {
  initialSession: SessionContext;
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState(initialSession.resolvedLanguage);

  useEffect(() => {
    const local = window.localStorage.getItem("relieflink.language");
    if (local && local !== language) {
      setLanguageState(local);
    }
  }, [language]);

  const setLanguage = async (nextLanguage: string) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("relieflink.language", nextLanguage);
    await fetch("/api/user/preferences/language", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language: nextLanguage }),
    });
  };

  const value = useMemo<LanguageContextValue>(() => {
    const dict = DICTS[language] ?? EN_DICT;
    return {
      ...initialSession,
      resolvedLanguage: language,
      language,
      setLanguage,
      t: (key) => dict[key] ?? EN_DICT[key] ?? key,
    };
  }, [initialSession, language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return value;
}
