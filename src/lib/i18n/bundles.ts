export type TranslationDict = Record<string, string>;

/** Built-in English source strings (all UI translation keys). */
export const EN_DICT: TranslationDict = {
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
  coordinatorQuery: "Questions",
  coordinatorHint: "Ask anything about operations, shipments, or the network.",
  askPlaceholder: "e.g. shipment ID, risk, or recent activity",
  runQuery: "Run query",
  language: "Language",
  loadingQuery: "Checking data...",
  responseLabel: "Response",
  voiceDelivery: "Voice delivery",

  navHome: "Home",
  navAdmin: "Admin",
  navNodes: "Nodes",
  navDriver: "Driver",
  navLedger: "Ledger",
  landingEyebrow: "ReliefLink",
  landingTitle: "Disaster food aid, verified on the ground and on-chain",
  landingSubtitle:
    "Pick a portal below. Drivers, node operators, and public observers all open instantly — only the UN admin portal can seed new drivers.",
  roleAdminTitle: "UN administrator",
  roleAdminDesc:
    "Register Arduinos, drivers, and nodes; oversee emergencies and the full live map.",
  roleAdminCta: "Open console",
  roleNodesTitle: "Network nodes",
  roleNodesDesc:
    "Pick any site—warehouse, store, or local node. Record need / want / have, track drivers, and get late-leg alerts.",
  roleNodesCta: "Open workspace",
  roleDriverTitle: "Driver",
  roleDriverDesc:
    "Pick your driver profile, share location, and request help when you need it.",
  roleDriverCta: "Open driver",
  roleLedgerTitle: "Public chain of custody",
  roleLedgerDesc:
    "Inspect Solana testnet transactions for every verified handoff.",
  roleLedgerCta: "View ledger",
  unOperations: "UN Operations",
  adminConsoleTitle: "Administrator console",
  adminConsoleDesc:
    "When a USB bridge registers new hardware, a prompt appears to add that device as a node. Respond to driver emergencies and monitor the network below.",
  adminSignedIn: "Signed in as administrator ·",
  adminLoginTitle: "Administrator sign-in",
  adminLoginBlurb:
    "Sign in to register hardware, drivers, and nodes. Default dev credentials are admin / admin unless overridden by environment variables.",
  backToHome: "Back to home",
  nodesEyebrow: "Network nodes",
  nodesTitle: "Sites & inventory",
  nodesDescBefore:
    "Choose a warehouse, store, or other node to edit need / want / have lists and watch for late inbound legs. Full network operations and the live map are on the",
  nodesDescLink: "Administrator console",
  nodesDescAfter: ".",
  trackEyebrow: "Public transparency",
  trackTitle: "Solana chain of custody",
  trackSubtitle:
    "Every verified handoff is anchored on Solana testnet. Below are shipments with on-chain memo signatures you can verify independently—no sign-in required.",
  trackLoading: "Loading public ledger…",
  signOut: "Sign out",
  ariaToggleTheme: "Toggle light or dark theme",

  driverPageSubtitle:
    "Pick your driver profile — your GPS, active leg, and distance to the next stop update live for UN admins and warehouses.",
  driverGeoUnavailable: "Location unavailable (use HTTPS or enable GPS).",
  driverGeoPermission: "Could not read GPS—check browser permissions.",
  driverDeviceIdRule: "device ID: letters, numbers, dot, underscore, hyphen only",
  driverToastHandoffTitle: "Handoff anchored on Solana.",
  driverToastHandoffExplorer: "View the signed leg on Solana Explorer.",
  driverToastHandoffDone: "The leg is complete.",
  driverSelectCardTitle: "Select driver",
  driverSelectCardDesc:
    "Only drivers seeded by the UN admin can sign in here. Search by name, email, or device ID.",
  driverFieldLabel: "Driver",
  driverPlaceholderNoDrivers: "No drivers seeded yet…",
  driverPlaceholderSearch: "Search drivers…",
  driverSearchPlaceholder: "Search name, email, or device id…",
  driverSearchEmpty: "No matching drivers.",
  driverSwitchDriver: "Switch driver",
  driverToastSignedIn: "Signed in as {{name}}",
  driverToastDeviceLine: "device {{id}}",
  driverJobLoadError: "Couldn't load assignments. Try refreshing.",
  driverJobChecking: "Checking for assignments…",
  driverNoDeliveryTitle: "No upcoming delivery",
  driverShipmentHeading: "Shipment {{id}}",
  driverReliefCargo: "Relief cargo",
  driverUnitsFmt: "{{n}} units",
  driverBadgePhotoRequired: "photo required",
  driverStatusInTransit: "in transit",
  driverStatusAwaitingProof: "awaiting proof",
  driverStatusPending: "pending",
  driverStatusDone: "done",
  driverStatusFlagged: "flagged",
  driverLegFmt: "leg {{current}}/{{total}}",
  driverDistanceToStop: "~{{dist}} to this stop (straight-line)",
  driverEnableLocationHint: "Enable location to see distance to this warehouse.",
  driverOpenInMap: "open in map",
  driverShipmentProgress: "Shipment progress",
  driverDeliveryAlertTitle: "Delivery photo required",
  driverDeliveryAlertDesc:
    "Capture the goods you delivered so AI can verify the shipment. You have {{secs}} before this leg is flagged for audit.",
  driverTakePhoto: "Take photo of goods",
  driverRetakePhoto: "Retake photo",
  driverSubmitPhoto: "Submit delivery photo",
  driverVerifying: "Verifying…",
  driverRefreshStatus: "Refresh status",
  driverStagedUpload: "Uploading delivery photo…",
  driverStagedVerify: "Verifying items with Gemini…",
  driverStagedAnchor: "Anchoring handoff on Solana…",
  driverStagedSuccess: "Delivery verified and anchored.",
  driverStagedPhotoFail: "Photo verification failed.",
  driverToastTakePhotoFirst: "Take a photo of the goods first.",
  driverToastWindowExpired:
    "The 2-minute window expired. Refresh to see the updated status.",
  driverToastQualityFlagged: "Delivered but quality flagged as {{quality}}.",
  driverToastManifestMismatch: "Delivered but goods do not match the manifest.",
  driverToastVerified: "Delivery verified ({{quality}}).",
  driverQGood: "good",
  driverQAcceptable: "acceptable",
  driverQPoor: "poor condition",
  driverQManifestMismatch: "manifest mismatch",
  driverInTransitTitle: "Waiting for tap at destination",
  driverInTransitDesc:
    "Touch the driver's copper pad to the beacon's pad. The store will buzz after 3 seconds and the handoff will sign on Solana.",
  driverLegComplete: "Leg complete",
  driverPhotoMissedBadge: "photo missed",
  driverViewChainAnchor: "view chain anchor",
  driverLatestOnChain: "Latest on-chain anchor:",
  driverLegStatusLine: "Leg is {{status}}.",
  driverEmergencyTitle: "Emergency assistance",
  driverEmergencyDesc:
    "Sends an alert to UN administrators with your device id and message. Use only for real incidents.",
  driverEmergencyPlaceholder: "Vehicle issue, route blocked, safety concern…",
  driverEmergencySending: "Sending…",
  driverEmergencyRequest: "Request assistance",
  driverEmergencyNeedDesc: "Describe what you need.",
  driverEmergencyNotified: "UN administrators have been notified.",
  driverAltDeliveryPreview: "Delivery preview",
};

/**
 * Locales with complete static UI strings (IETF BCP 47 tags).
 * Only these languages appear in the selector; no runtime machine translation.
 */
export const STATIC_UI_LANGUAGES = new Set([
  "en",
  "de",
  "fr",
  "pt",
  "zh",
  "cs",
  "fil",
  "sk",
  "es",
  "sv",
]);

export const DICTS: Record<string, TranslationDict> = {
  en: EN_DICT,

  de: {
    ...EN_DICT,
    operations: "Einsatzleitung",
    nodeNetwork: "Knotennetz",
    tagline:
      "Von den Vereinten Nationen koordinierte Lebensmittelhilfe über Lager und lokale Beacon-Knoten. Jeder Schritt wird beim physischen Übergang kryptografisch im Solana-Testnetz verankert.",
    driverConsole: "Fahrerkonsole",
    nodes: "Knoten",
    inTransit: "Unterwegs",
    delivered: "Geliefert",
    flagged: "Markiert",
    liveNetworkMap: "Live-Netzkarte",
    mapLegend:
      "Lager blau · Geschäfte grün · Haushalte bernsteinfarben · gestrichelte aktive Routen · orangefarbene Pins zeigen live GPS der Fahrer.",
    mapLegendReadOnly:
      "Routen in Echtzeit verfolgen. Hub-Knoten blau, Beacon-Knoten grün, aktive Routen gestrichelt, abgeschlossene Etappen durchgezogen.",
    transparency: "Transparenz",
    publicView: "Öffentliche Ansicht",
    publicTagline:
      "Nur-Lese-Karte und Sendungsfortschritt. Verwahrungsaktualisierungen erfolgen weiter über verifizierte Feld-Taps und UN-Einsätze.",
    shipments: "Sendungen",
    pollingEvery: "Aktualisierung alle",
    coordinatorQuery: "Fragen",
    coordinatorHint:
      "Stellen Sie beliebige Fragen zu Einsätzen, Sendungen oder dem Netzwerk.",
    askPlaceholder: "z. B. Sendungs-ID, Risiko oder letzte Aktivität",
    runQuery: "Abfrage starten",
    language: "Sprache",
    loadingQuery: "Daten werden geprüft …",
    responseLabel: "Antwort",
    voiceDelivery: "Sprachausgabe",
    navHome: "Start",
    navAdmin: "Admin",
    navNodes: "Knoten",
    navDriver: "Fahrer",
    navLedger: "Journal",
    landingEyebrow: "ReliefLink",
    landingTitle:
      "Nothilfe-Lebensmittel, vor Ort und on-chain nachverfolgbar",
    landingSubtitle:
      "Wählen Sie ein Portal. Fahrer, Knotenbetreiber und die Öffentlichkeit starten sofort — nur das UN-Admin-Portal kann neue Fahrer anlegen.",
    roleAdminTitle: "UN-Administrator",
    roleAdminDesc:
      "Registrieren Sie Arduinos, Fahrer und Knoten; überwachen Sie Notfälle und die Live-Karte.",
    roleAdminCta: "Konsole öffnen",
    roleNodesTitle: "Netzknoten",
    roleNodesDesc:
      "Wählen Sie ein Lager, Geschäft oder einen lokalen Knoten. Bedarf / Wunsch / Bestand, Fahrer verfolgen und Verspätungswarnungen.",
    roleNodesCta: "Arbeitsbereich öffnen",
    roleDriverTitle: "Fahrer",
    roleDriverDesc:
      "Profil wählen, Standort teilen und bei Bedarf Hilfe anfordern.",
    roleDriverCta: "Fahrer öffnen",
    roleLedgerTitle: "Öffentliche Verwahrungskette",
    roleLedgerDesc:
      "Solana-Testnet-Transaktionen für jede verifizierte Übergabe prüfen.",
    roleLedgerCta: "Journal ansehen",
    unOperations: "UN-Einsätze",
    adminConsoleTitle: "Administrator-Konsole",
    adminConsoleDesc:
      "Wenn eine USB-Brücke neue Hardware meldet, erscheint eine Aufforderung zum Anlegen des Knotens. Reagieren Sie auf Fahrernotfälle und überwachen Sie das Netz.",
    adminSignedIn: "Angemeldet als Administrator ·",
    adminLoginTitle: "Administrator-Anmeldung",
    adminLoginBlurb:
      "Melden Sie sich an, um Hardware, Fahrer und Knoten zu registrieren. Standard in der Entwicklung: admin / admin, sofern nicht per Umgebung überschrieben.",
    backToHome: "Zurück zur Startseite",
    nodesEyebrow: "Netzknoten",
    nodesTitle: "Standorte und Bestand",
    nodesDescBefore:
      "Wählen Sie Lager, Geschäft oder anderen Knoten, um Bedarf / Wunsch / Bestand zu bearbeiten und verspätete Anläufe zu beobachten. Volle Netzoperationen und die Live-Karte finden Sie in der",
    nodesDescLink: "Administrator-Konsole",
    nodesDescAfter: ".",
    trackEyebrow: "Öffentliche Transparenz",
    trackTitle: "Solana-Verwahrungskette",
    trackSubtitle:
      "Jede verifizierte Übergabe wird im Solana-Testnet verankert. Unten Sendungen mit On-Chain-Memo-Signaturen — ohne Anmeldung prüfbar.",
    trackLoading: "Öffentliches Journal wird geladen …",
    signOut: "Abmelden",
    ariaToggleTheme: "Helles oder dunkles Design umschalten",
  },

  fr: {
    ...EN_DICT,
    operations: "Opérations",
    nodeNetwork: "Réseau de nœuds",
    tagline:
      "Aide alimentaire coordonnée par l'ONU via entrepôts et nœuds balises locaux. Chaque passage physique est ancré cryptographiquement sur le testnet Solana.",
    driverConsole: "Console chauffeur",
    nodes: "Nœuds",
    inTransit: "En transit",
    delivered: "Livré",
    flagged: "Signalé",
    liveNetworkMap: "Carte du réseau en direct",
    mapLegend:
      "Entrepôts en bleu · magasins en vert · foyers en ambre · routes actives en tirets · épingles orange = GPS chauffeur en direct.",
    mapLegendReadOnly:
      "Suivez les routes en temps réel. Nœuds hub en bleu, nœuds balise en vert, routes actives en tirets, étapes terminées en trait plein.",
    transparency: "Transparence",
    publicView: "Vue publique",
    publicTagline:
      "Carte en lecture seule et progression des envois. Les mises à jour de garde passent toujours par des interactions terrain vérifiées et les opérations ONU.",
    shipments: "Expéditions",
    pollingEvery: "actualisation toutes les",
    coordinatorQuery: "Questions",
    coordinatorHint:
      "Posez vos questions sur les opérations, les expéditions ou le réseau.",
    askPlaceholder: "p. ex. ID d'envoi, risque ou activité récente",
    runQuery: "Exécuter",
    language: "Langue",
    loadingQuery: "Vérification des données …",
    responseLabel: "Réponse",
    voiceDelivery: "Diffusion vocale",
    navHome: "Accueil",
    navAdmin: "Admin",
    navNodes: "Nœuds",
    navDriver: "Chauffeur",
    navLedger: "Registre",
    landingEyebrow: "ReliefLink",
    landingTitle:
      "Aide alimentaire d'urgence, vérifiée sur le terrain et sur la chaîne",
    landingSubtitle:
      "Choisissez un portail ci-dessous. Conducteurs, opérateurs de nœuds et observateurs publics accèdent tout de suite — seul le portail administrateur ONU peut enregistrer de nouveaux conducteurs.",
    roleAdminTitle: "Administrateur ONU",
    roleAdminDesc:
      "Enregistrez Arduinos, conducteurs et nœuds ; suivez les urgences et la carte en direct.",
    roleAdminCta: "Ouvrir la console",
    roleNodesTitle: "Nœuds du réseau",
    roleNodesDesc:
      "Choisissez un site — entrepôt, magasin ou nœud local. Besoin / souhait / stock, suivi des chauffeurs et alertes de retard.",
    roleNodesCta: "Ouvrir l'espace",
    roleDriverTitle: "Chauffeur",
    roleDriverDesc:
      "Choisissez votre profil, partagez la position et demandez de l'aide si besoin.",
    roleDriverCta: "Ouvrir chauffeur",
    roleLedgerTitle: "Chaîne de responsabilité publique",
    roleLedgerDesc:
      "Inspectez les transactions Solana testnet pour chaque transfert vérifié.",
    roleLedgerCta: "Voir le registre",
    unOperations: "Opérations ONU",
    adminConsoleTitle: "Console administrateur",
    adminConsoleDesc:
      "Quand un pont USB enregistre du nouveau matériel, une invite permet d'ajouter ce nœud. Répondez aux urgences des chauffeurs et surveillez le réseau.",
    adminSignedIn: "Connecté en tant qu'administrateur ·",
    adminLoginTitle: "Connexion administrateur",
    adminLoginBlurb:
      "Connectez-vous pour enregistrer matériel, conducteurs et nœuds. En développement, identifiants par défaut admin / admin sauf variables d'environnement.",
    backToHome: "Retour à l'accueil",
    nodesEyebrow: "Nœuds du réseau",
    nodesTitle: "Sites et inventaire",
    nodesDescBefore:
      "Choisissez un entrepôt, magasin ou autre nœud pour modifier besoin / souhait / stock et surveiller les arrivées tardives. Les opérations réseau complètes et la carte en direct sont dans la",
    nodesDescLink: "console administrateur",
    nodesDescAfter: ".",
    trackEyebrow: "Transparence publique",
    trackTitle: "Chaîne de responsabilité Solana",
    trackSubtitle:
      "Chaque transfert vérifié est ancré sur Solana testnet. Ci-dessous : expéditions avec signatures mémo vérifiables sans connexion.",
    trackLoading: "Chargement du registre public …",
    signOut: "Se déconnecter",
    ariaToggleTheme: "Basculer entre thème clair et sombre",
  },

  pt: {
    ...EN_DICT,
    operations: "Operações",
    nodeNetwork: "Rede de nós",
    tagline:
      "Ajuda alimentar coordenada pela ONU via armazéns e nós farol locais. Cada passagem física fica ancorada criptograficamente na testnet Solana.",
    driverConsole: "Console do motorista",
    nodes: "Nós",
    inTransit: "Em trânsito",
    delivered: "Entregue",
    flagged: "Sinalizado",
    liveNetworkMap: "Mapa da rede ao vivo",
    mapLegend:
      "Armazéns em azul · lojas em verde · residências em âmbar · rotas ativas tracejadas · pinos laranja = GPS ao vivo do motorista.",
    mapLegendReadOnly:
      "Siga rotas em tempo real. Nós hub em azul, nós farol em verde, rotas ativas tracejadas, pernas concluídas contínuas.",
    transparency: "Transparência",
    publicView: "Vista pública",
    publicTagline:
      "Mapa só de leitura e progresso das remessas. Atualizações de custódia continuam por toques de campo verificados e operações da ONU.",
    shipments: "Remessas",
    pollingEvery: "atualizando a cada",
    coordinatorQuery: "Perguntas",
    coordinatorHint:
      "Pergunte o que precisar sobre operações, remessas ou a rede.",
    askPlaceholder: "ex.: ID da remessa, risco ou atividade recente",
    runQuery: "Executar consulta",
    language: "Idioma",
    loadingQuery: "Consultando dados …",
    responseLabel: "Resposta",
    voiceDelivery: "Entrega por voz",
    navHome: "Início",
    navAdmin: "Admin",
    navNodes: "Nós",
    navDriver: "Motorista",
    navLedger: "Livro-razão",
    landingEyebrow: "ReliefLink",
    landingTitle:
      "Ajuda alimentar em desastres, verificada no terreno e na cadeia",
    landingSubtitle:
      "Escolha um portal abaixo. Motoristas, operadores de nós e observadores públicos entram na hora — só o portal de administração da ONU pode cadastrar novos motoristas.",
    roleAdminTitle: "Administrador da ONU",
    roleAdminDesc:
      "Registre Arduinos, motoristas e nós; acompanhe emergências e o mapa ao vivo.",
    roleAdminCta: "Abrir console",
    roleNodesTitle: "Nós da rede",
    roleNodesDesc:
      "Escolha um local — armazém, loja ou nó local. Necessidade / desejo / disponível, acompanhe motoristas e alertas de atraso.",
    roleNodesCta: "Abrir área de trabalho",
    roleDriverTitle: "Motorista",
    roleDriverDesc:
      "Escolha o perfil de motorista, compartilhe localização e peça ajuda quando precisar.",
    roleDriverCta: "Abrir motorista",
    roleLedgerTitle: "Cadeia de custódia pública",
    roleLedgerDesc:
      "Inspecione transações na Solana testnet para cada transferência verificada.",
    roleLedgerCta: "Ver livro-razão",
    unOperations: "Operações da ONU",
    adminConsoleTitle: "Console do administrador",
    adminConsoleDesc:
      "Quando uma ponte USB registra hardware novo, surge um aviso para adicionar o nó. Responda a emergências de motoristas e monitore a rede.",
    adminSignedIn: "Sessão iniciada como administrador ·",
    adminLoginTitle: "Entrada do administrador",
    adminLoginBlurb:
      "Entre para registrar hardware, motoristas e nós. Em desenvolvimento, credenciais padrão admin / admin salvo variáveis de ambiente.",
    backToHome: "Voltar ao início",
    nodesEyebrow: "Nós da rede",
    nodesTitle: "Locais e inventário",
    nodesDescBefore:
      "Escolha um armazém, loja ou outro nó para editar listas de necessidade / desejo / disponível e acompanhar chegadas atrasadas. Operações completas da rede e o mapa ao vivo ficam no",
    nodesDescLink: "console do administrador",
    nodesDescAfter: ".",
    trackEyebrow: "Transparência pública",
    trackTitle: "Cadeia de custódia na Solana",
    trackSubtitle:
      "Cada transferência verificada fica ancorada na Solana testnet. Abaixo, remessas com assinaturas memo verificáveis sem login.",
    trackLoading: "Carregando livro público …",
    signOut: "Sair",
    ariaToggleTheme: "Alternar tema claro ou escuro",
  },

  zh: {
    ...EN_DICT,
    operations: "行动",
    nodeNetwork: "节点网络",
    tagline:
      "由联合国协调的食品援助，经仓库与本地信标节点配送。每一次实物交接都会在 Solana 测试网加密锚定。",
    driverConsole: "司机控制台",
    nodes: "节点",
    inTransit: "运输中",
    delivered: "已送达",
    flagged: "已标记",
    liveNetworkMap: "实时网络地图",
    mapLegend:
      "仓库为蓝色 · 门店为绿色 · 住所为琥珀色 · 虚线为在途路线 · 橙色标记为司机实时 GPS。",
    mapLegendReadOnly:
      "实时跟踪路线。枢纽节点为蓝色，信标节点为绿色，在途路线为虚线，已完成路段为实线。",
    transparency: "透明",
    publicView: "公开视图",
    publicTagline:
      "只读地图与货运进度。监管更新仍通过经核实的现场操作与联合国行动完成。",
    shipments: "货运",
    pollingEvery: "每",
    coordinatorQuery: "问题",
    coordinatorHint: "可就行动、货运或网络提出任何问题。",
    askPlaceholder: "例如：货运编号、风险或近期活动",
    runQuery: "运行查询",
    language: "语言",
    loadingQuery: "正在检查数据 …",
    responseLabel: "回复",
    voiceDelivery: "语音播报",
    navHome: "首页",
    navAdmin: "管理",
    navNodes: "节点",
    navDriver: "司机",
    navLedger: "账本",
    landingEyebrow: "ReliefLink",
    landingTitle: "灾难食品援助，实地与链上双重核验",
    landingSubtitle:
      "在下方选择入口。司机、节点运维与公众可立即进入 — 仅联合国管理员入口可添加新司机。",
    roleAdminTitle: "联合国管理员",
    roleAdminDesc: "登记 Arduino、司机与节点；监督突发事件与实时地图。",
    roleAdminCta: "打开控制台",
    roleNodesTitle: "网络节点",
    roleNodesDesc:
      "任选站点——仓库、门店或本地节点。记录需求 / 意向 / 库存，跟踪司机并接收晚点提醒。",
    roleNodesCta: "打开工作台",
    roleDriverTitle: "司机",
    roleDriverDesc: "选择司机档案、共享位置并在需要时求助。",
    roleDriverCta: "打开司机端",
    roleLedgerTitle: "公开监管链",
    roleLedgerDesc: "查看每笔经核实交接的 Solana 测试网交易。",
    roleLedgerCta: "查看账本",
    unOperations: "联合国行动",
    adminConsoleTitle: "管理员控制台",
    adminConsoleDesc:
      "当 USB 桥接器登记新硬件时，会提示将该设备添加为节点。响应司机紧急情况并监控网络。",
    adminSignedIn: "已以管理员身份登录 ·",
    adminLoginTitle: "管理员登录",
    adminLoginBlurb:
      "登录以登记硬件、司机与节点。开发环境默认凭据为 admin / admin，除非环境变量另有设置。",
    backToHome: "返回首页",
    nodesEyebrow: "网络节点",
    nodesTitle: "站点与库存",
    nodesDescBefore:
      "选择仓库、门店或其他节点以编辑需求 / 意向 / 库存列表并关注晚点进港。完整网络行动与实时地图请见",
    nodesDescLink: "管理员控制台",
    nodesDescAfter: "。",
    trackEyebrow: "公开透明",
    trackTitle: "Solana 监管链",
    trackSubtitle:
      "每笔经核实的交接均锚定在 Solana 测试网。以下为带有链上备忘录签名的货运，可独立验证 — 无需登录。",
    trackLoading: "正在加载公开账本 …",
    signOut: "退出登录",
    ariaToggleTheme: "切换浅色或深色主题",
  },

  cs: {
    ...EN_DICT,
    operations: "Operace",
    nodeNetwork: "Síť uzlů",
    tagline:
      "Potravinová pomoc koordinovaná OSN přes sklady a místní majákové uzly. Každý fyzický předání je kryptograficky ukotveno v testovací síti Solana.",
    driverConsole: "Konzole řidiče",
    nodes: "Uzly",
    inTransit: "Na cestě",
    delivered: "Doručeno",
    flagged: "Označeno",
    liveNetworkMap: "Živá mapa sítě",
    mapLegend:
      "Sklady modře · prodejny zeleně · domácnosti jantarově · čárkované aktivní trasy · oranžové špendlíky = živé GPS řidiče.",
    mapLegendReadOnly:
      "Sledujte trasy v reálném čase. Rozbočovací uzly modře, majákové zeleně, aktivní trasy čárkovaně, dokončené úseky plnou čarou.",
    transparency: "Transparentnost",
    publicView: "Veřejné zobrazení",
    publicTagline:
      "Mapa jen pro čtení a průběh zásilek. Aktualizace držby probíhají ověřenými terénními operacemi a akcemi OSN.",
    shipments: "Zásilky",
    pollingEvery: "obnovení každých",
    coordinatorQuery: "Dotazy",
    coordinatorHint:
      "Zeptejte se na cokoli ohledně operací, zásilek nebo sítě.",
    askPlaceholder: "např. ID zásilky, riziko nebo nedávná aktivita",
    runQuery: "Spustit dotaz",
    language: "Jazyk",
    loadingQuery: "Kontrola dat …",
    responseLabel: "Odpověď",
    voiceDelivery: "Hlasové přehrání",
    navHome: "Domů",
    navAdmin: "Správa",
    navNodes: "Uzly",
    navDriver: "Řidič",
    navLedger: "Kniha",
    landingEyebrow: "ReliefLink",
    landingTitle:
      "Potravinová pomoc při katastrofách, ověřená v terénu i na řetězci",
    landingSubtitle:
      "Vyberte portál níže. Řidiči, operátoři uzlů a veřejnost vstupují okamžitě — pouze správcovský portál OSN může přidávat nové řidiče.",
    roleAdminTitle: "Správce OSN",
    roleAdminDesc:
      "Registrujte Arduino, řidiče a uzly; sledujte nouzové situace a živou mapu.",
    roleAdminCta: "Otevřít konzoli",
    roleNodesTitle: "Síťové uzly",
    roleNodesDesc:
      "Vyberte místo — sklad, prodejnu nebo lokální uzel. Potřeba / přání / stav zásob, sledování řidičů a upozornění na zpoždění.",
    roleNodesCta: "Otevřít pracovní prostor",
    roleDriverTitle: "Řidič",
    roleDriverDesc:
      "Vyberte profil řidiče, sdílejte polohu a v případě potřeby požádejte o pomoc.",
    roleDriverCta: "Otevřít řidiče",
    roleLedgerTitle: "Veřejný řetěz odpovědnosti",
    roleLedgerDesc:
      "Prohlížejte transakce Solana testnet pro každé ověřené předání.",
    roleLedgerCta: "Zobrazit knihu",
    unOperations: "Operace OSN",
    adminConsoleTitle: "Správcovská konzole",
    adminConsoleDesc:
      "Když USB most zaregistruje nový hardware, zobrazí se výzva přidat uzel. Reagujte na nouzové situace řidičů a sledujte síť.",
    adminSignedIn: "Přihlášen jako správce ·",
    adminLoginTitle: "Přihlášení správce",
    adminLoginBlurb:
      "Přihlaste se pro registraci hardwaru, řidičů a uzlů. Výchozí vývojové údaje jsou admin / admin, pokud je prostředí nepřepíše.",
    backToHome: "Zpět na domovskou stránku",
    nodesEyebrow: "Síťové uzly",
    nodesTitle: "Lokality a zásoby",
    nodesDescBefore:
      "Vyberte sklad, prodejnu nebo jiný uzel pro úpravu seznamů potřeba / přání / zásob a sledování pozdních příjezdů. Plné síťové operace a živá mapa jsou v",
    nodesDescLink: "správcovské konzoli",
    nodesDescAfter: ".",
    trackEyebrow: "Veřejná transparentnost",
    trackTitle: "Řetěz odpovědnosti Solana",
    trackSubtitle:
      "Každé ověřené předání je ukotveno v Solana testnet. Níže zásilky s podpisy memo na řetězci ověřitelnými bez přihlášení.",
    trackLoading: "Načítání veřejné knihy …",
    signOut: "Odhlásit se",
    ariaToggleTheme: "Přepnout světlý nebo tmavý motiv",
  },

  fil: {
    ...EN_DICT,
    operations: "Operasyon",
    nodeNetwork: "Network ng mga node",
    tagline:
      "Tulong pagkain na inaayos ng UN sa pamamagitan ng mga bodega at lokal na beacon node. Bawat pisikal na turnover ay naka-anchor nang cryptographic sa Solana testnet.",
    driverConsole: "Console ng drayber",
    nodes: "Mga node",
    inTransit: "Byahe",
    delivered: "Naihatid na",
    flagged: "Minarkahan",
    liveNetworkMap: "Live na mapa ng network",
    mapLegend:
      "Mga bodega asul · mga tindahan berde · mga tahanan amber · putol-putol na aktibong ruta · orange pins = live GPS ng drayber.",
    mapLegendReadOnly:
      "Sundan ang mga ruta nang real-time. Hub nodes asul, beacon nodes berde, aktibong ruta putol-putol, natapos na legs solid.",
    transparency: "Transparency",
    publicView: "Pampublikong view",
    publicTagline:
      "Read-only na mapa at progreso ng shipment. Ang mga update sa custody ay sa pamamagitan pa rin ng verified field taps at operasyon ng UN.",
    shipments: "Mga shipment",
    pollingEvery: "nagre-refresh tuwing",
    coordinatorQuery: "Mga tanong",
    coordinatorHint:
      "Magtanong tungkol sa operasyon, shipment, o network.",
    askPlaceholder: "hal. ID ng shipment, panganib, o kamakailang aktibidad",
    runQuery: "Patakbuhin ang query",
    language: "Wika",
    loadingQuery: "Tinitingnan ang data …",
    responseLabel: "Sagot",
    voiceDelivery: "Voice delivery",
    navHome: "Home",
    navAdmin: "Admin",
    navNodes: "Mga node",
    navDriver: "Drayber",
    navLedger: "Ledger",
    landingEyebrow: "ReliefLink",
    landingTitle:
      "Tulong pagkain sa sakuna, na-verify sa lupa at sa chain",
    landingSubtitle:
      "Pumili ng portal sa ibaba. Mga drayber, operator ng node, at publiko ay agad makakapasok — ang UN admin portal lang ang makakapagdagdag ng bagong drayber.",
    roleAdminTitle: "Administrator ng UN",
    roleAdminDesc:
      "Magrehistro ng Arduino, drayber, at node; subaybayan ang emergency at live map.",
    roleAdminCta: "Buksan ang console",
    roleNodesTitle: "Mga node ng network",
    roleNodesDesc:
      "Pumili ng site — bodega, tindahan, o lokal na node. Pangangailangan / nais / available, subaybayan ang drayber at late-leg alerts.",
    roleNodesCta: "Buksan ang workspace",
    roleDriverTitle: "Drayber",
    roleDriverDesc:
      "Piliin ang profile ng drayber, ibahagi ang lokasyon, at humingi ng tulong kung kailangan.",
    roleDriverCta: "Buksan ang drayber",
    roleLedgerTitle: "Pampublikong chain of custody",
    roleLedgerDesc:
      "Suriin ang mga transaksyon sa Solana testnet para sa bawat verified na turnover.",
    roleLedgerCta: "Tingnan ang ledger",
    unOperations: "Operasyon ng UN",
    adminConsoleTitle: "Console ng administrator",
    adminConsoleDesc:
      "Kapag may bagong hardware na nirehistro ang USB bridge, may prompt para idagdag ang node. Tumugon sa emergency ng drayber at subaybayan ang network.",
    adminSignedIn: "Naka-sign in bilang administrator ·",
    adminLoginTitle: "Sign-in ng administrator",
    adminLoginBlurb:
      "Mag-sign in para magrehistro ng hardware, drayber, at node. Default sa dev: admin / admin maliban kung may environment variables.",
    backToHome: "Bumalik sa home",
    nodesEyebrow: "Mga node ng network",
    nodesTitle: "Mga site at imbentaryo",
    nodesDescBefore:
      "Pumili ng bodega, tindahan, o iba pang node para i-edit ang mga listahan ng pangangailangan / nais / available at bantayan ang late inbound. Ang buong operasyon ng network at live map ay nasa",
    nodesDescLink: "console ng administrator",
    nodesDescAfter: ".",
    trackEyebrow: "Pampublikong transparency",
    trackTitle: "Solana chain of custody",
    trackSubtitle:
      "Bawat verified na turnover ay naka-anchor sa Solana testnet. Sa ibaba ang mga shipment na may on-chain memo signatures na mabe-verify nang walang sign-in.",
    trackLoading: "Nilo-load ang pampublikong ledger …",
    signOut: "Mag-sign out",
    ariaToggleTheme: "Palitan ang light o dark theme",
  },

  sk: {
    ...EN_DICT,
    operations: "Operácie",
    nodeNetwork: "Sieť uzlov",
    tagline:
      "Potravinová pomoc koordinovaná OSN cez sklady a miestne majákové uzly. Každé fyzické odovzdanie je kryptograficky ukotvené v testovacej sieti Solana.",
    driverConsole: "Konzola vodiča",
    nodes: "Uzly",
    inTransit: "Na ceste",
    delivered: "Doručené",
    flagged: "Označené",
    liveNetworkMap: "Živá mapa siete",
    mapLegend:
      "Sklady modrou · obchody zelenou · domácnosti jantárovou · čiarkované aktívne trasy · oranžové kolíky = živé GPS vodiča.",
    mapLegendReadOnly:
      "Sledujte trasy v reálnom čase. Rozvodné uzly modré, majákové zelené, aktívne trasy čiarkované, dokončené úseky plnou čiarou.",
    transparency: "Transparentnosť",
    publicView: "Verejný pohľad",
    publicTagline:
      "Mapa len na čítanie a priebeh zásielok. Aktualizácie držby prebiehajú overenými terénnymi operáciami a akciami OSN.",
    shipments: "Zásielky",
    pollingEvery: "obnovenie každých",
    coordinatorQuery: "Otázky",
    coordinatorHint:
      "Opýtajte sa na čokoľvek o operáciách, zásielkach alebo sieti.",
    askPlaceholder: "napr. ID zásielky, riziko alebo nedávna aktivita",
    runQuery: "Spustiť dotaz",
    language: "Jazyk",
    loadingQuery: "Kontrola údajov …",
    responseLabel: "Odpoveď",
    voiceDelivery: "Hlasové prednesenie",
    navHome: "Domov",
    navAdmin: "Správa",
    navNodes: "Uzly",
    navDriver: "Vodič",
    navLedger: "Register",
    landingEyebrow: "ReliefLink",
    landingTitle:
      "Potravinová pomoc pri katastrofách, overená v teréne aj na reťazi",
    landingSubtitle:
      "Vyberte portál nižšie. Vodiči, prevádzkovatelia uzlov a verejnosť vstupujú okamžite — len správcovský portál OSN môže pridávať nových vodičov.",
    roleAdminTitle: "Správca OSN",
    roleAdminDesc:
      "Registrujte Arduino, vodičov a uzly; sledujte núdzové situácie a živú mapu.",
    roleAdminCta: "Otvoriť konzolu",
    roleNodesTitle: "Sieťové uzly",
    roleNodesDesc:
      "Vyberte miesto — sklad, obchod alebo lokálny uzol. Potreba / želanie / stav zásob, sledovanie vodičov a upozornenia na meškanie.",
    roleNodesCta: "Otvoriť pracovný priestor",
    roleDriverTitle: "Vodič",
    roleDriverDesc:
      "Vyberte profil vodiča, zdieľajte polohu a v prípade potreby požiadajte o pomoc.",
    roleDriverCta: "Otvoriť vodiča",
    roleLedgerTitle: "Verejný reťazec zodpovednosti",
    roleLedgerDesc:
      "Prezerajte transakcie Solana testnet pre každé overené odovzdanie.",
    roleLedgerCta: "Zobraziť register",
    unOperations: "Operácie OSN",
    adminConsoleTitle: "Správcovská konzola",
    adminConsoleDesc:
      "Keď USB most zaregistruje nový hardvér, zobrazí sa výzva pridať uzol. Reagujte na núdzové situácie vodičov a sledujte sieť.",
    adminSignedIn: "Prihlásený ako správca ·",
    adminLoginTitle: "Prihlásenie správcu",
    adminLoginBlurb:
      "Prihláste sa na registráciu hardvéru, vodičov a uzlov. Predvolené vývojové údaje sú admin / admin, ak ich prostredie neprepíše.",
    backToHome: "Späť na domovskú stránku",
    nodesEyebrow: "Sieťové uzly",
    nodesTitle: "Lokality a zásoby",
    nodesDescBefore:
      "Vyberte sklad, obchod alebo iný uzol na úpravu zoznamov potrieb / želaní / zásob a sledovanie oneskorených príchodov. Plné sieťové operácie a živá mapa sú v",
    nodesDescLink: "správcovskej konzole",
    nodesDescAfter: ".",
    trackEyebrow: "Verejná transparentnosť",
    trackTitle: "Reťazec zodpovednosti Solana",
    trackSubtitle:
      "Každé overené odovzdanie je ukotvené v Solana testnet. Nižšie zásielky s podpismi memo na reťazi overiteľnými bez prihlásenia.",
    trackLoading: "Načítanie verejného registra …",
    signOut: "Odhlásiť sa",
    ariaToggleTheme: "Prepínať svetlú alebo tmavú tému",
  },

  es: {
    ...EN_DICT,
    operations: "Operaciones",
    nodeNetwork: "Red de nodos",
    tagline:
      "Ayuda alimentaria coordinada por la ONU a través de almacenes y nodos baliza locales. Cada entrega física queda anclada criptográficamente en la testnet de Solana.",
    driverConsole: "Consola del conductor",
    nodes: "Nodos",
    inTransit: "En tránsito",
    delivered: "Entregado",
    flagged: "Marcado",
    liveNetworkMap: "Mapa de red en vivo",
    mapLegend:
      "Almacenes en azul · tiendas en verde · hogares en ámbar · rutas activas discontinuas · chinchetas naranjas = GPS en vivo del conductor.",
    mapLegendReadOnly:
      "Siga rutas en tiempo real. Nodos hub en azul, nodos baliza en verde, rutas activas discontinuas, tramos completados continuos.",
    transparency: "Transparencia",
    publicView: "Vista pública",
    publicTagline:
      "Mapa de solo lectura y progreso de envíos. Las actualizaciones de custodia siguen mediante toques de campo verificados y operaciones de la ONU.",
    shipments: "Envíos",
    pollingEvery: "actualizando cada",
    coordinatorQuery: "Preguntas",
    coordinatorHint:
      "Pregunte lo que necesite sobre operaciones, envíos o la red.",
    askPlaceholder: "p. ej. ID de envío, riesgo o actividad reciente",
    runQuery: "Ejecutar consulta",
    language: "Idioma",
    loadingQuery: "Consultando datos …",
    responseLabel: "Respuesta",
    voiceDelivery: "Entrega de voz",
    navHome: "Inicio",
    navAdmin: "Admin",
    navNodes: "Nodos",
    navDriver: "Conductor",
    navLedger: "Registro",
    landingEyebrow: "ReliefLink",
    landingTitle:
      "Ayuda alimentaria en desastres, verificada en el terreno y en cadena",
    landingSubtitle:
      "Elija un portal. Conductores, operadores de nodos y observadores públicos entran al instante; solo el portal de administración de la ONU puede dar de alta nuevos conductores.",
    roleAdminTitle: "Administrador de la ONU",
    roleAdminDesc:
      "Registre Arduinos, conductores y nodos; supervise emergencias y el mapa en vivo.",
    roleAdminCta: "Abrir consola",
    roleNodesTitle: "Nodos de red",
    roleNodesDesc:
      "Elija un sitio (almacén, tienda o nodo local). Registre necesidad / deseo / disponible, siga conductores y reciba alertas de retrasos.",
    roleNodesCta: "Abrir espacio de trabajo",
    roleDriverTitle: "Conductor",
    roleDriverDesc:
      "Elija su perfil de conductor, comparta ubicación y pida ayuda cuando la necesite.",
    roleDriverCta: "Abrir conductor",
    roleLedgerTitle: "Cadena de custodia pública",
    roleLedgerDesc:
      "Inspeccione las transacciones de Solana testnet de cada entrega verificada.",
    roleLedgerCta: "Ver registro",
    unOperations: "Operaciones de la ONU",
    adminConsoleTitle: "Consola de administración",
    adminConsoleDesc:
      "Cuando un puente USB registra hardware nuevo, aparece un aviso para añadirlo como nodo. Responda a emergencias de conductores y supervise la red.",
    adminSignedIn: "Sesión iniciada como administrador ·",
    adminLoginTitle: "Acceso de administrador",
    adminLoginBlurb:
      "Inicie sesión para registrar hardware, conductores y nodos. En desarrollo, las credenciales por defecto son admin / admin salvo que las variables de entorno indiquen lo contrario.",
    backToHome: "Volver al inicio",
    nodesEyebrow: "Nodos de red",
    nodesTitle: "Sitios e inventario",
    nodesDescBefore:
      "Elija un almacén, tienda u otro nodo para editar listas de necesidad / deseo / disponible y vigilar llegadas tardías. Las operaciones completas de red y el mapa en vivo están en la",
    nodesDescLink: "consola de administración",
    nodesDescAfter: ".",
    trackEyebrow: "Transparencia pública",
    trackTitle: "Cadena de custodia en Solana",
    trackSubtitle:
      "Cada entrega verificada queda anclada en Solana testnet. Abajo hay envíos con firmas memo en cadena que puede comprobar sin iniciar sesión.",
    trackLoading: "Cargando registro público …",
    signOut: "Cerrar sesión",
    ariaToggleTheme: "Cambiar tema claro u oscuro",
  },

  sv: {
    ...EN_DICT,
    operations: "Verksamhet",
    nodeNetwork: "Nätverksnoder",
    tagline:
      "FN-koordinerad matinsats via lager och lokala fyrnoder. Varje fysiskt överlämnande kryptografiskt förankrat på Solana-testnätet.",
    driverConsole: "Förarkonsol",
    nodes: "Noder",
    inTransit: "Under transport",
    delivered: "Levererad",
    flagged: "Flaggad",
    liveNetworkMap: "Live nätverkskarta",
    mapLegend:
      "Lager i blått · butiker i grönt · hem i bärnsten · streckade aktiva rutter · orange kartnålar = live GPS för förare.",
    mapLegendReadOnly:
      "Följ rutter i realtid. Hub-noder blå, fyrnoder gröna, aktiva rutter streckade, avslutade delsträckor heldragna.",
    transparency: "Transparens",
    publicView: "Publik vy",
    publicTagline:
      "Skrivskyddad karta och sändningsstatus. Uppdateringar av förvar sker via verifierade fälttryckningar och FN-insatser.",
    shipments: "Sändningar",
    pollingEvery: "uppdatering var",
    coordinatorQuery: "Frågor",
    coordinatorHint:
      "Fråga vad som helst om verksamhet, sändningar eller nätverket.",
    askPlaceholder: "t.ex. sändnings-ID, risk eller nylig aktivitet",
    runQuery: "Kör fråga",
    language: "Språk",
    loadingQuery: "Kontrollerar data …",
    responseLabel: "Svar",
    voiceDelivery: "Röstleverans",
    navHome: "Hem",
    navAdmin: "Admin",
    navNodes: "Noder",
    navDriver: "Förare",
    navLedger: "Register",
    landingEyebrow: "ReliefLink",
    landingTitle:
      "Katastrofmat, verifierad på plats och på kedjan",
    landingSubtitle:
      "Välj en portal nedan. Förare, nodoperatörer och allmänheten öppnar direkt — endast FN:s adminportal kan lägga till nya förare.",
    roleAdminTitle: "FN-administratör",
    roleAdminDesc:
      "Registrera Arduino, förare och noder; övervaka nödlägen och livekartan.",
    roleAdminCta: "Öppna konsol",
    roleNodesTitle: "Nätverksnoder",
    roleNodesDesc:
      "Välj en plats — lager, butik eller lokal nod. Behov / önskemål / saldo, följ förare och få varningar om förseningar.",
    roleNodesCta: "Öppna arbetsyta",
    roleDriverTitle: "Förare",
    roleDriverDesc:
      "Välj förarprofil, dela position och be om hjälp vid behov.",
    roleDriverCta: "Öppna förare",
    roleLedgerTitle: "Offentlig förvaringskedja",
    roleLedgerDesc:
      "Granska Solana testnet-transaktioner för varje verifierat överlämnande.",
    roleLedgerCta: "Visa register",
    unOperations: "FN-operationer",
    adminConsoleTitle: "Administratörskonsol",
    adminConsoleDesc:
      "När en USB-brygga registrerar ny hårdvara visas en uppmaning att lägga till noden. Svara på nödsituationer för förare och övervaka nätverket.",
    adminSignedIn: "Inloggad som administratör ·",
    adminLoginTitle: "Administratörsinloggning",
    adminLoginBlurb:
      "Logga in för att registrera hårdvara, förare och noder. Standard i utveckling: admin / admin om inte miljövariabler åsidosätter.",
    backToHome: "Tillbaka till startsidan",
    nodesEyebrow: "Nätverksnoder",
    nodesTitle: "Platser och lager",
    nodesDescBefore:
      "Välj lager, butik eller annan nod för att redigera listor över behov / önskemål / saldo och bevaka sena anlöp. Full nätverksverksamhet och livekarta finns i",
    nodesDescLink: "administratörskonsolen",
    nodesDescAfter: ".",
    trackEyebrow: "Offentlig transparens",
    trackTitle: "Solana-förvaringskedja",
    trackSubtitle:
      "Varje verifierat överlämnande förankras på Solana testnet. Nedan sändningar med memo-signaturer på kedjan som du kan verifiera utan inloggning.",
    trackLoading: "Laddar offentligt register …",
    signOut: "Logga ut",
    ariaToggleTheme: "Växla ljust eller mörkt tema",
  },
};
