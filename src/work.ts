// Owner-supplied copy. Preserve wording; only PDF line-wrap hyphenation is repaired.
export interface Description {
  paragraphs: string[];
  heading?: string;
  introduction?: string;
  bullets?: string[];
  closing?: string;
}
export interface Project {
  slug: string;
  title: string;
  organization: string;
  category: "Data engineering" | "Applied AI" | "Analytics";
  summary: string;
  tags: string[];
  featured?: boolean;
  color: string;
  period?: string;
  role?: string;
  location?: string;
  language?: string;
  description: Description;
  flow?: string[];
  collaborators?: string;
  links: { label: string; href: string }[];
}
export interface Experience {
  title: string;
  company: string;
  location: string;
  period: string;
  language?: string;
  contributions: string[];
  technologies: string[];
  projects: string[];
}

const serviceNow = [
  "Designed a Medallion Architecture (Bronze/Silver/Gold) on Microsoft Fabric to industrialize ServiceNow data processing: ingestion into Lakehouse/OneLake, PySpark/Python transformations, and quality controls across ~40 business variables.",
  "Designed a star schema and developed data pipelines as well as Power BI/DAX dashboards, including SLA calculations, anomaly detection, and automated alerts via Microsoft Teams.",
];
const chronoBrain =
  "Developed a RAG platform for structured and unstructured data, integrating ingestion, cleaning, chunking, hybrid FAISS/BM25 search, and language models; deployed using Docker and AWS EC2.";
const akkan = [
  "Deployed a Big Data infrastructure consolidating funding data from more than 10 simultaneous clients.",
  "Implemented an ETL pipeline feeding an analytical Data Warehouse for decision-making purposes.",
  "Designed a multi-tenant architecture providing each client with dedicated data warehouses and customized dashboards.",
];
const everest = [
  "Developed pipelines for extracting, transforming, and cleaning raw data for Power BI.",
  "Modeled data structures using star schema to monitor more than 5 critical performance indicators.",
  "Created interactive dashboards with DAX measures to help management interpret data and make decisions.",
];
const smartFactory = [
  "Conception d’un pipeline de bout en bout pour l’ingestion, le traitement et la préparation de données d’images.",
  "Application de techniques d’augmentation de données afin d’enrichir et de renforcer les jeux de données d’entraînement.",
  "Entraînement et évaluation de modèles prédictifs (CNN) atteignant une précision de 92 % en classification d’images.",
];
const inetumTools = [
  "Python",
  "Microsoft Fabric",
  "SQL",
  "Airflow",
  "PostgreSQL",
  "AWS Ec2",
  "Docker",
  "Lakehouse",
];
const akkanTools = [
  "Python",
  "Apache Spark",
  "Airflow",
  "SQL Server",
  "ClickHouse",
  "Power BI",
  "Azure VM",
];
const everestTools = ["Power BI", "Data Modeling", "DAX"];
const smartFactoryTools = [
  "CNN",
  "TensorFlow",
  "PyTorch",
  "Keras",
  "Data Augmentation",
];

export const experiences: Experience[] = [
  {
    title: "Data Engineer AI (Internship)",
    company: "Inetum",
    location: "Casablanca",
    period: "March – August 2026",
    contributions: [...serviceNow, chronoBrain],
    technologies: inetumTools,
    projects: ["servicenow-analytics", "chronobrain"],
  },
  {
    title: "Data Engineer (Internship)",
    company: "Akkan Crowdfunding",
    location: "Casablanca",
    period: "July – Sept 2025",
    contributions: akkan,
    technologies: akkanTools,
    projects: ["akkan-crowdfunding"],
  },
  {
    title: "BI Engineer (Internship)",
    company: "Everest Indus",
    location: "Remote",
    period: "July – Aug 2024",
    contributions: everest,
    technologies: everestTools,
    projects: ["business-intelligence-dashboards"],
  },
  {
    title: "Data Engineer - Pipeline ML (Stage)",
    company: "3D Smart Factory",
    location: "À distance",
    period: "Juil – Sept 2024",
    language: "fr",
    contributions: smartFactory,
    technologies: smartFactoryTools,
    projects: ["image-data-ml-pipeline"],
  },
];

export const projects: Project[] = [
  {
    slug: "servicenow-analytics",
    title: "ServiceNow Incident Analytics",
    organization: "Inetum",
    category: "Data engineering",
    featured: true,
    color: "blue",
    period: "March – August 2026",
    role: "Data Engineer AI (Internship)",
    location: "Casablanca",
    summary: serviceNow[0],
    tags: ["Microsoft Fabric", "PySpark", "Power BI"],
    description: { paragraphs: [], bullets: serviceNow },
    flow: [
      "ServiceNow",
      "Bronze · ingestion",
      "Silver · transformations",
      "Gold · star schema",
      "Power BI / Teams",
    ],
    links: [],
  },
  {
    slug: "chronobrain",
    title: "ChronoBrain — RAG Platform",
    organization: "Inetum",
    category: "Applied AI",
    featured: true,
    color: "green",
    period: "March – August 2026",
    role: "Data Engineer AI (Internship)",
    location: "Casablanca",
    summary: chronoBrain,
    tags: ["FAISS / BM25", "Docker", "AWS EC2"],
    description: { paragraphs: [chronoBrain] },
    flow: [
      "Source data",
      "Ingestion & cleaning",
      "Chunking",
      "FAISS / BM25",
      "Language models",
    ],
    links: [],
  },
  {
    slug: "akkan-crowdfunding",
    title: "Multi-tenant Data Warehouse & ETL Pipeline",
    organization: "Akkan Crowdfunding",
    category: "Data engineering",
    featured: true,
    color: "peach",
    period: "July – Sept 2025",
    role: "Data Engineer (Internship)",
    location: "Casablanca",
    summary: akkan[0],
    tags: akkanTools,
    description: { paragraphs: [], bullets: akkan },
    flow: [
      "Funding data",
      "ETL pipeline",
      "Dedicated data warehouses",
      "Customized dashboards",
    ],
    links: [],
  },
  {
    slug: "flowtrade",
    title: "Real-Time Market Data Engineering Platform on Google Cloud (GCP)",
    organization:
      "FlowTrade · Ecole Nationale des Sciences Appliquées de Berrechid",
    category: "Data engineering",
    color: "lilac",
    period: "Oct 2025 – Dec 2025",
    summary:
      "In today’s financial landscape, the ability to process and analyze market data in real-time is a game-changer. FlowTrade was designed to handle high-velocity data streams, ensuring seamless ingestion, processing, and visualization for actionable insights.",
    tags: [
      "Google Cloud Platform (GCP)",
      "Python",
      "Pub/Sub",
      "Apache Beam / Dataflow",
      "BigQuery",
    ],
    description: {
      paragraphs: [
        "In today’s financial landscape, the ability to process and analyze market data in real-time is a game-changer. FlowTrade was designed to handle high-velocity data streams, ensuring seamless ingestion, processing, and visualization for actionable insights.",
      ],
      heading: "The Architecture:",
      introduction:
        "Leveraging the power of GCP, we built a robust pipeline that includes:",
      bullets: [
        "Data Ingestion: Using Cloud Pub/Sub for reliable, real-time messaging.",
        "Processing: Stream processing via Apache Beam/Cloud Dataflow.",
        "Storage: Scalable warehousing with BigQuery.",
        "Interface: A dynamic dashboard providing a clear, real-time view of market fluctuations and trends.",
      ],
    },
    flow: [
      "Cloud Pub/Sub",
      "Apache Beam / Cloud Dataflow",
      "BigQuery",
      "Dashboard",
    ],
    collaborators: "ISSAM, Aymen and Salmane Zid",
    links: [
      {
        label: "Public repository",
        href: "https://github.com/ImaneBenzegunine/FlowTrade-Real-Time-Market-Data-Engineering-Platform-on-Google-Cloud-GCP",
      },
      {
        label: "Project announcement",
        href: "https://www.linkedin.com/posts/imane-benzegunine_architecture-activity-7412752763320848384-GtoN",
      },
    ],
  },
  {
    slug: "rag-document-intelligence",
    title: "RAG-Powered Document Intelligence System",
    organization: "Document intelligence",
    category: "Applied AI",
    color: "green",
    period: "Aug 2025 – Aug 2025",
    summary:
      "Built an advanced Retrieval-Augmented Generation (RAG) system that transforms PDF documents into intelligent knowledge bases. Engineered a dual-index architecture combining FAISS (Facebook AI Similarity Search) vector search with BM25 keyword retrieval for superior context precision.",
    tags: [
      "RAG",
      "Artificial Intelligence (AI)",
      "FAISS",
      "BM25",
      "SentenceTransformers",
      "Flan-T5",
    ],
    description: {
      paragraphs: [
        "Built an advanced Retrieval-Augmented Generation (RAG) system that transforms PDF documents into intelligent knowledge bases. Engineered a dual-index architecture combining FAISS (Facebook AI Similarity Search) vector search with BM25 keyword retrieval for superior context precision.",
      ],
      heading: "Key achievements:",
      bullets: [
        "Implemented hybrid retrieval leveraging SentenceTransformers and semantic search",
        "Developed chunking strategies optimized for LLM context windows (Flan-T5)",
        "Created end-to-end pipeline from PDF processing to AI-powered Q&A",
      ],
      closing:
        "This system demonstrates cutting-edge RAG implementation for enterprise document intelligence, showcasing expertise in vector databases, LLM integration, and large-scale text processing.",
    },
    flow: [
      "PDF processing",
      "Chunking",
      "SentenceTransformers",
      "FAISS / BM25",
      "Flan-T5 · Q&A",
    ],
    links: [],
  },
  {
    slug: "quiz-master",
    title: "Quiz-Master",
    organization: "Team project",
    category: "Applied AI",
    color: "lilac",
    period: "Apr 2025 – Apr 2025",
    summary: "",
    tags: ["Artificial Intelligence (AI)", "Teamwork"],
    description: { paragraphs: [] },
    collaborators: "Maria and Ilham",
    links: [],
  },
  {
    slug: "chatbot-for-university",
    title: "Chatbot for University",
    organization: "Team project",
    category: "Applied AI",
    color: "green",
    summary:
      "An AI-powered chatbot designed to classify user inputs and provide intelligent responses using Python, Flask, PyTorch, and NLP techniques.",
    tags: ["Python", "Flask", "PyTorch", "NLP"],
    description: {
      paragraphs: [
        "An AI-powered chatbot designed to classify user inputs and provide intelligent responses using Python, Flask, PyTorch, and NLP techniques.",
      ],
    },
    collaborators: "Marwa and IKRAM",
    links: [],
  },
  {
    slug: "business-intelligence-dashboards",
    title: "Power BI Pipelines & KPI Dashboards",
    organization: "Everest Indus",
    category: "Analytics",
    color: "blue",
    period: "July – Aug 2024",
    role: "BI Engineer (Internship)",
    location: "Remote",
    summary: everest[0],
    tags: everestTools,
    description: { paragraphs: [], bullets: everest },
    flow: [
      "Raw data",
      "Extract, transform & clean",
      "Star schema",
      "Power BI / DAX",
    ],
    links: [],
  },
  {
    slug: "image-data-ml-pipeline",
    title: "Pipeline de données d’images & classification CNN",
    organization: "3D Smart Factory",
    category: "Applied AI",
    color: "peach",
    period: "Juil – Sept 2024",
    role: "Data Engineer - Pipeline ML (Stage)",
    location: "À distance",
    language: "fr",
    summary: smartFactory[0],
    tags: smartFactoryTools,
    description: { paragraphs: [], bullets: smartFactory },
    flow: [
      "Données d’images",
      "Ingestion & préparation",
      "Augmentation",
      "Entraînement CNN",
      "Évaluation",
    ],
    links: [],
  },
  {
    slug: "automotive-price-analysis",
    title: "Automotive Price Analysis",
    organization: "Project",
    category: "Analytics",
    color: "sand",
    summary:
      "Data collection, incremental ingestion, and orchestration leading into a price prediction model.",
    tags: ["Data ingestion", "Airflow", "Prediction"],
    description: {
      paragraphs: [
        "Data collection, incremental ingestion, and orchestration leading into a price prediction model.",
      ],
    },
    flow: [
      "Listings",
      "Incremental ingestion",
      "Airflow",
      "Prepared data",
      "Prediction model",
    ],
    links: [],
  },
];
