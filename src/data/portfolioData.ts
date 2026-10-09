export interface ProjectItem {
  id: string;
  title: string;
  subtitle: string;
  role: string;
  period: string;
  description: string;
  highlights: string[];
  tags: string[];
  demoUrl?: string;
  githubUrl?: string;
  accentColor: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  location: string;
  role: string;
  period: string;
  bullets: string[];
  techStack: string[];
}

export interface SkillCategory {
  category: string;
  color: string;
  skills: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  period: string;
  gpa: string;
  notes?: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  year: string;
}

export interface LanguageItem {
  language: string;
  proficiency: string;
}

export interface ContactInfo {
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  summary: string;
}

export interface PortfolioData {
  contact: ContactInfo;
  projects: ProjectItem[];
  experiences: ExperienceItem[];
  skillCategories: SkillCategory[];
  education: EducationItem[];
  certifications: CertificationItem[];
  languages: LanguageItem[];
}

export const portfolioData: PortfolioData = {
  contact: {
    name: "Raihan Firdaus",
    role: "Software Engineer | Full-Stack Web & Mobile Developer",
    location: "Surabaya, East Java, Indonesia",
    email: "rfirdaus.firdaus1@gmail.com",
    phone: "+62 823 3162 6316",
    linkedin: "https://linkedin.com/in/rraihanfirdaus",
    github: "https://github.com/RH203",
    summary:
      "Results-driven Software Engineer with a Bachelor of Informatics Engineering from Telkom University (GPA: 3.70/4.00) based in Surabaya. Hands-on experience developing and optimizing enterprise web applications, high-throughput RESTful APIs, and cross-platform mobile systems with clean architecture and strict security standards."
  },
  projects: [
    {
      id: "jatim-bissa",
      title: "Jatim Bissa",
      subtitle: "Regional Public Service API Platform",
      role: "Lead Back-End Developer",
      period: "Feb 2025 - Oct 2025",
      description:
        "Regional public service integration platform engineered for East Java administrative systems.",
      highlights: [
        "Spearheaded architectural design of RESTful APIs using Laravel and PostgreSQL for regional public service integrations.",
        "Applied database indexing and multi-layer caching strategies to prevent query bottlenecks during peak user traffic.",
        "Authored interactive Swagger/OpenAPI documentation for cross-agency developer onboarding."
      ],
      tags: ["Laravel", "PostgreSQL", "RESTful API", "Redis Caching", "Swagger", "OpenAPI"],
      accentColor: "#bd93f9"
    },
    {
      id: "roaming-marketplace",
      title: "Telkomsel Branch Roaming Package Marketplace",
      subtitle: "Telecom Data Package E-Commerce & Recommendation Engine",
      role: "Full-Stack Developer",
      period: "Sep 2025 - Dec 2025",
      description:
        "End-to-end digital marketplace handling international data package purchases with machine learning tiering.",
      highlights: [
        "Engineered digital marketplace with Laravel and Livewire featuring automated transaction verification and payment workflows.",
        "Integrated machine learning recommendation algorithms (K-Means and Random Forest) for dynamic discount tiering.",
        "Built encrypted role-based access control (RBAC) administration dashboard."
      ],
      tags: ["Laravel", "Livewire", "Machine Learning", "Random Forest", "K-Means", "MySQL", "RBAC"],
      accentColor: "#50fa7b"
    },
    {
      id: "flutter-mic-selector",
      title: "flutter_mic_selector",
      subtitle: "Cross-Platform Audio Input Hardware Plugin",
      role: "Plugin Author & Maintainer",
      period: "2026",
      description:
        "Published Flutter plugin enabling dynamic routing and selection between built-in, wired, and Bluetooth audio input sources.",
      highlights: [
        "Engineered native platform channels for Android and iOS audio manager communication.",
        "Maintained and published open package with clean cross-platform interface."
      ],
      tags: ["Flutter", "Dart", "Android AudioRecord", "iOS CoreAudio", "Open Source"],
      accentColor: "#ff79c6"
    }
  ],
  experiences: [
    {
      id: "de-vivace",
      company: "De Vivace",
      location: "Surabaya, Indonesia",
      role: "Full-Stack Web & Mobile Developer",
      period: "Apr 2026 - Present",
      bullets: [
        "Architected and delivered modular enterprise web applications (ERP, HRIS, and Warehouse Management Systems / WMS) aligned with complex business logic and operational data integrity.",
        "Designed and integrated high-throughput RESTful APIs synchronizing web and mobile platforms with token authentication, automated retry mechanisms, and exponential backoff for fault tolerance.",
        "Engineered responsive cross-platform mobile modules using Flutter; maintained and published custom audio-input plugin (flutter_mic_selector).",
        "Collaborated across full SDLC in agile development team, participating in regular code reviews and enforcing clean architecture standards."
      ],
      techStack: ["Laravel", "Flutter", "RESTful APIs", "ERP/WMS", "PostgreSQL", "Clean Architecture"]
    },
    {
      id: "db-kiik",
      company: "DB KIIK",
      location: "Surabaya, Indonesia",
      role: "Full-Stack Web Developer",
      period: "Aug 2025 - Feb 2026",
      bullets: [
        "Maintained and expanded core transactional features and web user interfaces for production internal e-commerce platform (Portal Produk) using Laravel, jQuery, and Bootstrap.",
        "Profiled database query execution plans and optimized SQL indexing structures, decreasing average server response times by 5%.",
        "Enforced secure coding protocols across application endpoints, implementing strict input sanitization, CSRF/XSS mitigation, and multi-tier role-based access validation (RBAC).",
        "Authored comprehensive automated unit and feature test suites in PHPUnit, achieving over 70% code coverage to prevent production regressions."
      ],
      techStack: ["Laravel", "PHPUnit", "PostgreSQL", "SQL Tuning", "OWASP Security", "jQuery"]
    },
    {
      id: "telkom-univ-lab",
      company: "Telkom University Surabaya",
      location: "Surabaya, Indonesia",
      role: "Practicum Assistant (Computing Laboratory)",
      period: "Feb 2025 - May 2025",
      bullets: [
        "Mentored 100+ undergraduate students in Object-Oriented Programming (OOP), Data Structures & Algorithms, and Artificial Intelligence using Java, Go, and Python.",
        "Audited and reviewed student project codebases for algorithmic efficiency, clean code principles, and standardized debugging methodologies."
      ],
      techStack: ["Java", "Go", "Python", "Data Structures", "Algorithms", "OOP"]
    }
  ],
  skillCategories: [
    {
      category: "Programming Languages",
      color: "#bd93f9",
      skills: ["Java", "JavaScript (ES6+)", "Go (Golang)", "PHP", "Python", "Dart", "SQL", "HTML5 / CSS3"]
    },
    {
      category: "Backend & Architecture",
      color: "#50fa7b",
      skills: ["Laravel", "RESTful APIs", "Microservices & Modular Design", "Token Authentication", "Swagger / OpenAPI", "Clean Architecture"]
    },
    {
      category: "Mobile & Frontend",
      color: "#ff79c6",
      skills: ["Flutter (Android & iOS)", "Tailwind CSS", "Bootstrap", "Blade / Livewire", "jQuery", "Responsive UI Design"]
    },
    {
      category: "Databases & Tuning",
      color: "#8be9fd",
      skills: ["PostgreSQL", "MySQL", "B-Tree Indexing", "EXPLAIN Query Plan Profiling", "Latency Optimization"]
    },
    {
      category: "Security & Testing",
      color: "#f1fa8c",
      skills: ["OWASP Top 10", "RBAC Access Control", "CSRF / XSS Mitigation", "Input Sanitization", "PHPUnit (>70% Coverage)"]
    },
    {
      category: "DevOps & Tooling",
      color: "#ffb86c",
      skills: ["Git", "GitHub", "Linux CLI", "Postman", "CI/CD Principles", "Agile / Scrum"]
    }
  ],
  education: [
    {
      degree: "Bachelor of Informatics Engineering (S.Kom.)",
      institution: "Telkom University Surabaya",
      period: "2021 - 2025",
      gpa: "3.70 / 4.00",
      notes: "Exceeds 3.30 cum laude standard"
    }
  ],
  certifications: [
    {
      name: "Professional Certifications: SQL Database Administration, Web Development, and Flutter Application Development",
      issuer: "Dicoding Academy",
      year: "2025"
    },
    {
      name: "Flutter & Dart Complete Cross-Platform Development Bootcamp",
      issuer: "Udemy",
      year: "2025"
    }
  ],
  languages: [
    { language: "Indonesian", proficiency: "Native" },
    { language: "English", proficiency: "Working Proficiency (CEFR B1, EPRT: 483)" }
  ]
};
