export type Language = 'es' | 'en' | 'pt' | 'fr';

export interface Translations {
  siteTitle: string;
  liveNode: string;
  searchPlaceholder: string;
  authorLogin: string;
  authorLogout: string;
  writingStreak: string;
  activeStatus: string;
  streakDescription: string;
  postsCount: string;
  upvotesCountBadge: string;
  uptimeBadge: string;
  newPostBtn: string;
  allTopics: string;
  sortByRecent: string;
  sortByTopVoted: string;
  sortByTrending: string;
  minRead: string;
  viewsCount: string;
  originalLangBadge: string;
  bookmarkSave: string;
  bookmarked: string;
  noArticlesFound: string;
  noArticlesSub: string;
  readingMode: string;
  byAuthor: string;
  publishedOn: string;
  summaryLabel: string;
  copySnippet: string;
  copiedSnippet: string;
  shareBtn: string;
  votes: string;
  linkCopied: string;
  createNewPost: string;
  postTitleLabel: string;
  postTitlePlaceholder: string;
  postLangLabel: string;
  postSummaryLabel: string;
  postSummaryPlaceholder: string;
  postCoverLabel: string;
  postCoverPlaceholder: string;
  uploadImageBtn: string;
  uploadingImage: string;
  readingTimeLabel: string;
  tagsLabel: string;
  contentMarkdownLabel: string;
  contentMarkdownPlaceholder: string;
  publishPostBtn: string;
  publishingPost: string;
  cancelBtn: string;
  footerText: string;
}

export const translations: Record<Language, Translations> = {
  es: {
    siteTitle: 'SYS.BLOG',
    liveNode: '● Live Node',
    searchPlaceholder: 'Buscar por tecnología o palabra clave...',
    authorLogin: 'Acceso Autor',
    authorLogout: 'Cerrar Sesión',
    writingStreak: 'DÍAS DE RACHA DE ESCRITURA',
    activeStatus: 'ACTIVA',
    streakDescription: 'Publicando aprendizajes continuos sobre arquitectura, sistemas distribuidos y homelab.',
    postsCount: 'posts',
    upvotesCountBadge: 'upvotes',
    uptimeBadge: 'uptime',
    newPostBtn: 'Nuevo Post',
    allTopics: 'Todos los temas',
    sortByRecent: '✨ Más Recientes',
    sortByTopVoted: '▲ Más Votados',
    sortByTrending: '🔥 En Tendencia',
    minRead: 'min',
    viewsCount: 'vistas',
    originalLangBadge: 'Idioma original',
    bookmarkSave: 'Guardar en marcadores',
    bookmarked: 'Guardado',
    noArticlesFound: 'No se encontraron artículos',
    noArticlesSub: 'Prueba seleccionando otro filtro o limpiando el buscador.',
    readingMode: 'Modo Lectura',
    byAuthor: 'Por Ingeniero de Software',
    publishedOn: 'Publicado el',
    summaryLabel: 'Resumen:',
    copySnippet: 'Copiar',
    copiedSnippet: 'Copiado',
    shareBtn: 'Compartir',
    votes: 'Votos',
    linkCopied: '¡Enlace del artículo copiado al portapapeles!',
    createNewPost: 'Crear Nuevo Artículo Técnico',
    postTitleLabel: 'Título del Artículo',
    postTitlePlaceholder: 'Ej: Diseñando un sistema de colas con RabbitMQ',
    postLangLabel: 'Idioma Original',
    postSummaryLabel: 'Resumen Ejecutivo',
    postSummaryPlaceholder: 'Breve síntesis de la arquitectura y aprendizajes clave...',
    postCoverLabel: 'Imagen de Portada (URL o Subir archivo)',
    postCoverPlaceholder: 'https://images.unsplash.com/... o sube un archivo local',
    uploadImageBtn: 'Subir Imagen Local',
    uploadingImage: 'Subiendo imagen...',
    readingTimeLabel: 'Tiempo estimado de lectura (min)',
    tagsLabel: 'Categorías y Tags',
    contentMarkdownLabel: 'Contenido en Markdown',
    contentMarkdownPlaceholder: '# Mi Arquitectura\n\nExplica aquí los conceptos, diagramas y fragmentos de código...',
    publishPostBtn: 'Publicar Artículo',
    publishingPost: 'Publicando...',
    cancelBtn: 'Cancelar',
    footerText: '© 2026 SYS.BLOG • Diseñado para Homelab • Desplegado con Docker • React + FastAPI',
  },
  en: {
    siteTitle: 'SYS.BLOG',
    liveNode: '● Live Node',
    searchPlaceholder: 'Search by technology or keyword...',
    authorLogin: 'Author Login',
    authorLogout: 'Log Out',
    writingStreak: 'DAYS WRITING STREAK',
    activeStatus: 'ACTIVE',
    streakDescription: 'Publishing continuous learnings on systems architecture, distributed computing, and homelab.',
    postsCount: 'posts',
    upvotesCountBadge: 'upvotes',
    uptimeBadge: 'uptime',
    newPostBtn: 'New Post',
    allTopics: 'All Topics',
    sortByRecent: '✨ Most Recent',
    sortByTopVoted: '▲ Top Voted',
    sortByTrending: '🔥 Trending',
    minRead: 'min read',
    viewsCount: 'views',
    originalLangBadge: 'Original language',
    bookmarkSave: 'Save bookmark',
    bookmarked: 'Saved',
    noArticlesFound: 'No articles found',
    noArticlesSub: 'Try selecting a different tag or clearing your search.',
    readingMode: 'Reading Mode',
    byAuthor: 'By Software Engineer',
    publishedOn: 'Published on',
    summaryLabel: 'Summary:',
    copySnippet: 'Copy',
    copiedSnippet: 'Copied',
    shareBtn: 'Share',
    votes: 'Votes',
    linkCopied: 'Article link copied to clipboard!',
    createNewPost: 'Create New Technical Article',
    postTitleLabel: 'Article Title',
    postTitlePlaceholder: 'E.g.: Designing a Queueing System with RabbitMQ',
    postLangLabel: 'Original Language',
    postSummaryLabel: 'Executive Summary',
    postSummaryPlaceholder: 'Brief synthesis of the architecture and key takeaways...',
    postCoverLabel: 'Cover Image (URL or Upload file)',
    postCoverPlaceholder: 'https://images.unsplash.com/... or upload a local image',
    uploadImageBtn: 'Upload Local Image',
    uploadingImage: 'Uploading image...',
    readingTimeLabel: 'Estimated reading time (min)',
    tagsLabel: 'Categories & Tags',
    contentMarkdownLabel: 'Markdown Content',
    contentMarkdownPlaceholder: '# Architecture Overview\n\nExplain concepts, system diagrams, and code snippets...',
    publishPostBtn: 'Publish Article',
    publishingPost: 'Publishing...',
    cancelBtn: 'Cancel',
    footerText: '© 2026 SYS.BLOG • Built for Homelab • Deployed with Docker • React + FastAPI',
  },
  pt: {
    siteTitle: 'SYS.BLOG',
    liveNode: '● Live Node',
    searchPlaceholder: 'Pesquisar por tecnologia ou palavra-chave...',
    authorLogin: 'Acesso Autor',
    authorLogout: 'Encerrar Sessão',
    writingStreak: 'DIAS DE SEQUÊNCIA DE ESCRITA',
    activeStatus: 'ATIVA',
    streakDescription: 'Publicando aprendizados contínuos sobre arquitetura, sistemas distribuídos e homelab.',
    postsCount: 'posts',
    upvotesCountBadge: 'upvotes',
    uptimeBadge: 'uptime',
    newPostBtn: 'Novo Post',
    allTopics: 'Todos os temas',
    sortByRecent: '✨ Mais Recentes',
    sortByTopVoted: '▲ Mais Votados',
    sortByTrending: '🔥 Em Tendência',
    minRead: 'min',
    viewsCount: 'visualizações',
    originalLangBadge: 'Idioma original',
    bookmarkSave: 'Salvar nos favoritos',
    bookmarked: 'Salvo',
    noArticlesFound: 'Nenhum artigo encontrado',
    noArticlesSub: 'Tente selecionar outro filtro ou limpar a pesquisa.',
    readingMode: 'Modo Leitura',
    byAuthor: 'Por Engenheiro de Software',
    publishedOn: 'Publicado em',
    summaryLabel: 'Resumo:',
    copySnippet: 'Copiar',
    copiedSnippet: 'Copiado',
    shareBtn: 'Compartilhar',
    votes: 'Votos',
    linkCopied: 'Link do artigo copiado para a área de transferência!',
    createNewPost: 'Criar Novo Artigo Técnico',
    postTitleLabel: 'Título do Artigo',
    postTitlePlaceholder: 'Ex: Projetando um sistema de filas com RabbitMQ',
    postLangLabel: 'Idioma Original',
    postSummaryLabel: 'Resumo Executivo',
    postSummaryPlaceholder: 'Breve síntese da arquitetura e aprendizados principais...',
    postCoverLabel: 'Imagem de Capa (URL ou Enviar arquivo)',
    postCoverPlaceholder: 'https://images.unsplash.com/... ou envie um arquivo local',
    uploadImageBtn: 'Enviar Imagem Local',
    uploadingImage: 'Enviando imagem...',
    readingTimeLabel: 'Tempo estimado de leitura (min)',
    tagsLabel: 'Categorias e Tags',
    contentMarkdownLabel: 'Conteúdo em Markdown',
    contentMarkdownPlaceholder: '# Minha Arquitetura\n\nExplique aqui os conceitos, diagramas e trechos de código...',
    publishPostBtn: 'Publicar Artigo',
    publishingPost: 'Publicando...',
    cancelBtn: 'Cancelar',
    footerText: '© 2026 SYS.BLOG • Projetado para Homelab • Implantado com Docker • React + FastAPI',
  },
  fr: {
    siteTitle: 'SYS.BLOG',
    liveNode: '● Live Node',
    searchPlaceholder: 'Rechercher par technologie ou mot-clé...',
    authorLogin: 'Accès Auteur',
    authorLogout: 'Déconnexion',
    writingStreak: 'JOURS DE SÉRIE D\'ÉCRITURE',
    activeStatus: 'ACTIVE',
    streakDescription: 'Partage d\'apprentissages continus sur l\'architecture, les systèmes distribués et le homelab.',
    postsCount: 'articles',
    upvotesCountBadge: 'votes',
    uptimeBadge: 'disponibilité',
    newPostBtn: 'Nouvel Article',
    allTopics: 'Tous les thèmes',
    sortByRecent: '✨ Plus Récents',
    sortByTopVoted: '▲ Plus Votés',
    sortByTrending: '🔥 Tendance',
    minRead: 'min de lecture',
    viewsCount: 'vues',
    originalLangBadge: 'Langue originale',
    bookmarkSave: 'Enregistrer dans les favoris',
    bookmarked: 'Enregistré',
    noArticlesFound: 'Aucun article trouvé',
    noArticlesSub: 'Essayez de sélectionner un autre filtre ou d\'effacer la recherche.',
    readingMode: 'Mode Lecture',
    byAuthor: 'Par Ingénieur Logiciel',
    publishedOn: 'Publié le',
    summaryLabel: 'Résumé :',
    copySnippet: 'Copier',
    copiedSnippet: 'Copié',
    shareBtn: 'Partager',
    votes: 'Votes',
    linkCopied: 'Lien de l\'article copié dans le presse-papiers !',
    createNewPost: 'Créer un Nouvel Article Technique',
    postTitleLabel: 'Titre de l\'Article',
    postTitlePlaceholder: 'Ex: Concevoir un système de files avec RabbitMQ',
    postLangLabel: 'Langue Originale',
    postSummaryLabel: 'Résumé Exécutif',
    postSummaryPlaceholder: 'Brève synthèse de l\'architecture et des points clés...',
    postCoverLabel: 'Image de Couverture (URL ou Télécharger)',
    postCoverPlaceholder: 'https://images.unsplash.com/... ou téléchargez un fichier',
    uploadImageBtn: 'Télécharger une Image Locale',
    uploadingImage: 'Téléchargement de l\'image...',
    readingTimeLabel: 'Temps de lecture estimé (min)',
    tagsLabel: 'Catégories & Tags',
    contentMarkdownLabel: 'Contenu Markdown',
    contentMarkdownPlaceholder: '# Architecture\n\nExpliquez ici les concepts, diagrammes et extraits de code...',
    publishPostBtn: 'Publier l\'Article',
    publishingPost: 'Publication en cours...',
    cancelBtn: 'Annuler',
    footerText: '© 2026 SYS.BLOG • Conçu pour Homelab • Déployé avec Docker • React + FastAPI',
  },
};

export const languageFlags: Record<string, string> = {
  es: '🇪🇸',
  en: '🇺🇸',
  pt: '🇧🇷',
  fr: '🇫🇷',
};

export const languageNames: Record<string, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
};

export function getLanguageFlag(lang: string): string {
  return languageFlags[lang.toLowerCase()] || '🌐';
}

export function getLanguageName(lang: string): string {
  return languageNames[lang.toLowerCase()] || lang.toUpperCase();
}
