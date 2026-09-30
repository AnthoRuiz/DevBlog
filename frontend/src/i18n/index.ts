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
  bookmarksTab: string;
  clearFilter: string;
  activeTagFilter: string;
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
  noBookmarksFound: string;
  noBookmarksSub: string;
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
  editPostModalTitle: string;
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
  readingTimeAuto: string;
  aiReadingTimeNote: string;
  tagsLabel: string;
  searchTagsPlaceholder: string;
  createNewTagAction: string;
  suggestTagsAiBtn: string;
  suggestingTagsAi: string;
  aiSuggestedTagsTitle: string;
  noTagsFound: string;
  selectedTagsCount: string;
  contentMarkdownLabel: string;
  contentMarkdownPlaceholder: string;
  publishPostBtn: string;
  publishingPost: string;
  saveChangesBtn: string;
  savingChanges: string;
  cancelBtn: string;
  commentsSectionTitle: string;
  commentsCount: string;
  leaveCommentTitle: string;
  commentPlaceholder: string;
  authorNamePlaceholder: string;
  postCommentBtn: string;
  postingComment: string;
  noCommentsYet: string;
  editPostBtn: string;
  deletePostBtn: string;
  confirmDeletePost: string;
  loginTitle: string;
  registerTitle: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  createAccountBtn: string;
  creatingAccount: string;
  alreadyAccountText: string;
  needAccountText: string;
  googleLoginBtn: string;
  tableOfContents: string;
  aiTranslateBtn: string;
  translatingWithAi: string;
  aiTranslateSuccess: string;
  aiTranslatePrompt: string;
  editorWriteTab: string;
  editorPreviewTab: string;
  editorMarkdownHelp: string;
  toolbarBold: string;
  toolbarItalic: string;
  toolbarHeading2: string;
  toolbarHeading3: string;
  toolbarBulletList: string;
  toolbarNumberedList: string;
  toolbarCodeBlock: string;
  toolbarInlineCode: string;
  toolbarQuote: string;
  toolbarLink: string;
  toolbarTable: string;
  toolbarDivider: string;
  toolbarImage: string;
  toolbarImageUploading: string;
  loadMorePosts: string;
  loadingMorePosts: string;
  // Placeholders: {shown}, {total}
  showingPostsCount: string;
  allSections: string;
  sectionsNavLabel: string;
  sectionLabel: string;
  sectionPlaceholder: string;
  sectionRequired: string;
  // Placeholders: {tag}, {section}
  tagSectionMismatch: string;
  // Placeholder: {section}
  tagCreateInSection: string;
  tagCreateAnyway: string;
  tagCheckingSection: string;
  tagOtherSections: string;
  aiUnavailableBanner: string;
  aiTranslateUnavailable: string;
  keywordSuggestedTagsTitle: string;
  noTagSuggestions: string;
  keywordSuggestedTagsQuota: string;
  aiQuotaExhausted: string;
  // Placeholder: {minutes}
  aiRetryIn: string;
  aiRetryLater: string;
  aiTranslateFailed: string;
  editorEmptyPreview: string;
  markdownGuideTitle: string;
  systemStatusBtn: string;
  systemStatusTitle: string;
  systemStatusSubtitle: string;
  systemOperational: string;
  systemDegraded: string;
  overallLatency: string;
  servicesHealth: string;
  hardwareTelemetry: string;
  cpuUsage: string;
  ramUsage: string;
  diskUsage: string;
  temperature: string;
  systemUptime: string;
  hostPlatform: string;
  autoRefreshLive: string;
  refreshNow: string;
  viewSystemStatus: string;
  footerText: string;
}

export const translations: Record<Language, Translations> = {
  es: {
    siteTitle: 'SYS.BLOG',
    liveNode: '● Live Node',
    searchPlaceholder: 'Buscar por tecnología o palabra clave...',
    authorLogin: 'Acceso / Registro',
    authorLogout: 'Cerrar Sesión',
    writingStreak: 'DÍAS DE RACHA DE ESCRITURA',
    activeStatus: 'ACTIVA',
    streakDescription: 'Publicando aprendizajes continuos sobre arquitectura, sistemas distribuidos y homelab.',
    postsCount: 'posts',
    upvotesCountBadge: 'upvotes',
    uptimeBadge: 'uptime',
    newPostBtn: 'Nuevo Post',
    allTopics: 'Todos los temas',
    bookmarksTab: '📌 Guardados',
    clearFilter: '✕ Limpiar filtro',
    activeTagFilter: 'Filtrado por',
    sortByRecent: '✨ Más Recientes',
    sortByTopVoted: '▲ Más Votados',
    sortByTrending: '🔥 En Tendencia',
    minRead: 'min de lectura',
    viewsCount: 'vistas',
    originalLangBadge: 'Idioma original',
    bookmarkSave: 'Guardar en marcadores',
    bookmarked: 'Guardado',
    noArticlesFound: 'No se encontraron artículos',
    noArticlesSub: 'Intenta seleccionar otro filtro o buscar un término diferente.',
    noBookmarksFound: 'No tienes artículos guardados aún',
    noBookmarksSub: 'Haz clic en el icono de marcador en cualquier tarjeta para guardarlo aquí.',
    readingMode: 'Modo Lectura',
    byAuthor: 'Por Ingeniero de Software',
    publishedOn: 'Publicado el',
    summaryLabel: 'Resumen Ejecutivo:',
    copySnippet: 'Copiar',
    copiedSnippet: 'Copiado',
    shareBtn: 'Compartir',
    votes: 'Votos',
    linkCopied: '¡Enlace del artículo copiado al portapapeles!',
    createNewPost: 'Crear Nuevo Artículo Técnico',
    editPostModalTitle: 'Editar Artículo Técnico',
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
    readingTimeAuto: 'Calculado automáticamente',
    aiReadingTimeNote: 'Tiempo de lectura estimado por IA según densidad técnica',
    tagsLabel: 'Categorías y Tags',
    searchTagsPlaceholder: 'Buscar categoría o escribir una nueva...',
    createNewTagAction: 'Crear nueva categoría',
    suggestTagsAiBtn: '✨ Sugerir con IA',
    suggestingTagsAi: 'Analizando contenido...',
    aiSuggestedTagsTitle: 'Sugerencias de IA para este artículo:',
    noTagsFound: 'No se encontraron categorías coincidentes. Presiona Enter para crearla.',
    selectedTagsCount: 'seleccionadas',
    contentMarkdownLabel: 'Contenido del Artículo',
    contentMarkdownPlaceholder: '## Arquitectura\n\nExplica aquí los conceptos, diagramas y fragmentos de código...',
    publishPostBtn: 'Publicar Artículo',
    publishingPost: 'Publicando...',
    saveChangesBtn: 'Guardar Cambios',
    savingChanges: 'Guardando...',
    cancelBtn: 'Cancelar',
    commentsSectionTitle: 'Discusión Técnica y Comentarios',
    commentsCount: 'comentarios',
    leaveCommentTitle: 'Dejar un comentario o aporte',
    commentPlaceholder: 'Escribe tu comentario o pregunta sobre esta implementación...',
    authorNamePlaceholder: 'Tu nombre (ej: Ingeniero DevOps)',
    postCommentBtn: 'Publicar Comentario',
    postingComment: 'Enviando...',
    noCommentsYet: 'Aún no hay comentarios. ¡Sé el primero en iniciar la conversación técnica!',
    editPostBtn: 'Editar',
    deletePostBtn: 'Eliminar',
    confirmDeletePost: '¿Estás seguro de que deseas eliminar este artículo permanentemente?',
    loginTitle: 'Acceso Autor / Dashboard',
    registerTitle: 'Crear Cuenta de Lector',
    fullNameLabel: 'Nombre Completo',
    fullNamePlaceholder: 'Alex Developer',
    createAccountBtn: 'Registrar Cuenta',
    creatingAccount: 'Creando cuenta...',
    alreadyAccountText: '¿Ya tienes cuenta? Inicia sesión',
    needAccountText: '¿No tienes cuenta? Regístrate aquí',
    googleLoginBtn: 'Continuar con Google Workspace',
    tableOfContents: 'Tabla de Contenidos',
    aiTranslateBtn: '⚡ Traducir con IA',
    translatingWithAi: 'Traduciendo con IA...',
    aiTranslateSuccess: '¡Artículo traducido exitosamente!',
    aiTranslatePrompt: 'Selecciona el idioma de destino para autotraducir:',
    editorWriteTab: 'Escribir',
    editorPreviewTab: 'Vista Previa',
    editorMarkdownHelp: 'Ayuda Markdown',
    toolbarBold: 'Negrita (**texto**)',
    toolbarItalic: 'Cursiva (*texto*)',
    toolbarHeading2: 'Título de Sección (##)',
    toolbarHeading3: 'Subtítulo (###)',
    toolbarBulletList: 'Lista con viñetas (-)',
    toolbarNumberedList: 'Lista numerada (1.)',
    toolbarCodeBlock: 'Bloque de código (```)',
    toolbarInlineCode: 'Código en línea (`código`)',
    toolbarQuote: 'Cita / Alerta (> Nota)',
    toolbarLink: 'Enlace ([texto](url))',
    toolbarTable: 'Insertar tabla técnica',
    toolbarDivider: 'Línea divisoria (---)',
    toolbarImage: 'Subir e insertar imagen (JPG, PNG, WEBP, GIF)',
    toolbarImageUploading: 'Subiendo imagen...',
    loadMorePosts: 'Cargar más artículos',
    loadingMorePosts: 'Cargando...',
    showingPostsCount: 'Mostrando {shown} de {total} artículos',
    allSections: 'Todo',
    sectionsNavLabel: 'Secciones del blog',
    sectionLabel: 'Sección',
    sectionPlaceholder: 'Elige una sección',
    sectionRequired: 'Elige la sección del artículo.',
    tagSectionMismatch: '"{tag}" parece de {section}, no de esta sección.',
    tagCreateInSection: 'Crear en {section}',
    tagCreateAnyway: 'Crear aquí de todos modos',
    tagCheckingSection: 'Comprobando sección...',
    tagOtherSections: 'Otras secciones',
    aiUnavailableBanner: 'IA no configurada: la traducción está desactivada y las sugerencias de tags usan palabras clave. Configura ANTHROPIC_API_KEY o GEMINI_API_KEY.',
    aiTranslateUnavailable: 'La traducción requiere un proveedor de IA configurado',
    keywordSuggestedTagsTitle: 'Sugerencias por palabras clave (sin IA)',
    noTagSuggestions: 'No se encontraron sugerencias de tags para este contenido.',
    keywordSuggestedTagsQuota: 'Sugerencias por palabras clave (cuota de IA agotada)',
    aiQuotaExhausted: 'No se pudo traducir: se agotó la cuota gratuita de IA.',
    aiRetryIn: 'Vuelve a intentarlo en unos {minutes} min.',
    aiRetryLater: 'Vuelve a intentarlo más tarde.',
    aiTranslateFailed: 'No se pudo traducir: el servicio de IA falló. Inténtalo de nuevo.',
    editorEmptyPreview: 'El artículo aún no tiene contenido. Escribe en la pestaña "Escribir" para ver la previsualización.',
    markdownGuideTitle: 'Guía Rápida de Formato Markdown (Estilo Word)',
    systemStatusBtn: '🖥️ Estado (/status)',
    systemStatusTitle: 'Estado del Sistema y Telemetría',
    systemStatusSubtitle: 'Métricas de hardware y latencias en vivo del nodo Homelab',
    systemOperational: 'Todos los servicios operacionales',
    systemDegraded: 'Rendimiento degradado',
    overallLatency: 'Latencia general',
    servicesHealth: 'Salud de Servicios y Conectividad',
    hardwareTelemetry: 'Telemetría de Hardware en Vivo',
    cpuUsage: 'Uso de CPU',
    ramUsage: 'Memoria RAM',
    diskUsage: 'Almacenamiento NVMe',
    temperature: 'Temperatura',
    systemUptime: 'Tiempo Activo',
    hostPlatform: 'Plataforma Host',
    autoRefreshLive: 'En vivo (5s)',
    refreshNow: 'Actualizar',
    viewSystemStatus: 'Ver Estado del Servidor',
    footerText: '© 2026 SYS.BLOG • Diseñado para Homelab • Desplegado con Docker • React + FastAPI',
  },
  en: {
    siteTitle: 'SYS.BLOG',
    liveNode: '● Live Node',
    searchPlaceholder: 'Search by technology or keyword...',
    authorLogin: 'Login / Register',
    authorLogout: 'Log Out',
    writingStreak: 'DAYS WRITING STREAK',
    activeStatus: 'ACTIVE',
    streakDescription: 'Publishing continuous learnings on systems architecture, distributed computing, and homelab.',
    postsCount: 'posts',
    upvotesCountBadge: 'upvotes',
    uptimeBadge: 'uptime',
    newPostBtn: 'New Post',
    allTopics: 'All Topics',
    bookmarksTab: '📌 Saved',
    clearFilter: '✕ Clear filter',
    activeTagFilter: 'Filtered by',
    sortByRecent: '✨ Most Recent',
    sortByTopVoted: '▲ Most Voted',
    sortByTrending: '🔥 Trending',
    minRead: 'min read',
    viewsCount: 'views',
    originalLangBadge: 'Original language',
    bookmarkSave: 'Save to bookmarks',
    bookmarked: 'Saved',
    noArticlesFound: 'No articles found',
    noArticlesSub: 'Try selecting another filter or searching for a different keyword.',
    noBookmarksFound: 'No saved articles yet',
    noBookmarksSub: 'Click the bookmark icon on any card to save it here for later reading.',
    readingMode: 'Reading Mode',
    byAuthor: 'By Software Engineer',
    publishedOn: 'Published on',
    summaryLabel: 'Executive Summary:',
    copySnippet: 'Copy',
    copiedSnippet: 'Copied',
    shareBtn: 'Share',
    votes: 'Votes',
    linkCopied: 'Article link copied to clipboard!',
    createNewPost: 'Create New Technical Article',
    editPostModalTitle: 'Edit Technical Article',
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
    readingTimeAuto: 'Calculated automatically',
    aiReadingTimeNote: 'Reading time estimated by AI based on technical density',
    tagsLabel: 'Categories & Tags',
    searchTagsPlaceholder: 'Search category or type a new one...',
    createNewTagAction: 'Create new category',
    suggestTagsAiBtn: '✨ Suggest with AI',
    suggestingTagsAi: 'Analyzing content...',
    aiSuggestedTagsTitle: 'AI suggestions for this article:',
    noTagsFound: 'No matching categories found. Press Enter to create it.',
    selectedTagsCount: 'selected',
    contentMarkdownLabel: 'Article Content',
    contentMarkdownPlaceholder: '## Architecture Overview\n\nExplain concepts, system diagrams, and code snippets...',
    publishPostBtn: 'Publish Article',
    publishingPost: 'Publishing...',
    saveChangesBtn: 'Save Changes',
    savingChanges: 'Saving...',
    cancelBtn: 'Cancel',
    commentsSectionTitle: 'Technical Discussion & Comments',
    commentsCount: 'comments',
    leaveCommentTitle: 'Leave a comment or feedback',
    commentPlaceholder: 'Write your thoughts or questions about this implementation...',
    authorNamePlaceholder: 'Your name (e.g. DevOps Engineer)',
    postCommentBtn: 'Post Comment',
    postingComment: 'Posting...',
    noCommentsYet: 'No comments yet. Be the first to spark the technical conversation!',
    editPostBtn: 'Edit',
    deletePostBtn: 'Delete',
    confirmDeletePost: 'Are you sure you want to permanently delete this article?',
    loginTitle: 'Author Access / Dashboard',
    registerTitle: 'Create Reader Account',
    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'Alex Developer',
    createAccountBtn: 'Register Account',
    creatingAccount: 'Creating account...',
    alreadyAccountText: 'Already have an account? Sign in',
    needAccountText: 'Need an account? Register here',
    googleLoginBtn: 'Continue with Google Workspace',
    tableOfContents: 'Table of Contents',
    aiTranslateBtn: '⚡ Translate with AI',
    translatingWithAi: 'Translating with AI...',
    aiTranslateSuccess: 'Article translated successfully!',
    aiTranslatePrompt: 'Select target language to auto-translate:',
    editorWriteTab: 'Write',
    editorPreviewTab: 'Preview',
    editorMarkdownHelp: 'Markdown Help',
    toolbarBold: 'Bold (**text**)',
    toolbarItalic: 'Italic (*text*)',
    toolbarHeading2: 'Section Heading (##)',
    toolbarHeading3: 'Subheading (###)',
    toolbarBulletList: 'Bullet list (-)',
    toolbarNumberedList: 'Numbered list (1.)',
    toolbarCodeBlock: 'Code block (```)',
    toolbarInlineCode: 'Inline code (`code`)',
    toolbarQuote: 'Quote / Note (> Note)',
    toolbarLink: 'Link ([text](url))',
    toolbarTable: 'Insert technical table',
    toolbarDivider: 'Divider line (---)',
    toolbarImage: 'Upload and insert image (JPG, PNG, WEBP, GIF)',
    toolbarImageUploading: 'Uploading image...',
    loadMorePosts: 'Load more posts',
    loadingMorePosts: 'Loading...',
    showingPostsCount: 'Showing {shown} of {total} posts',
    allSections: 'All',
    sectionsNavLabel: 'Blog sections',
    sectionLabel: 'Section',
    sectionPlaceholder: 'Choose a section',
    sectionRequired: 'Choose the section for this post.',
    tagSectionMismatch: '"{tag}" looks like {section}, not this section.',
    tagCreateInSection: 'Create in {section}',
    tagCreateAnyway: 'Create here anyway',
    tagCheckingSection: 'Checking section...',
    tagOtherSections: 'Other sections',
    aiUnavailableBanner: 'AI is not configured: translation is disabled and tag suggestions use keywords. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.',
    aiTranslateUnavailable: 'Translation requires a configured AI provider',
    keywordSuggestedTagsTitle: 'Keyword-based suggestions (no AI)',
    noTagSuggestions: 'No tag suggestions found for this content.',
    keywordSuggestedTagsQuota: 'Keyword-based suggestions (AI quota exhausted)',
    aiQuotaExhausted: 'Could not translate: the free AI quota has run out.',
    aiRetryIn: 'Try again in about {minutes} min.',
    aiRetryLater: 'Try again later.',
    aiTranslateFailed: 'Could not translate: the AI service failed. Please try again.',
    editorEmptyPreview: 'The article does not have content yet. Write in the "Write" tab to see the live preview.',
    markdownGuideTitle: 'Quick Markdown Formatting Guide (Word-like)',
    systemStatusBtn: '🖥️ Status (/status)',
    systemStatusTitle: 'System Status & Telemetry',
    systemStatusSubtitle: 'Live hardware metrics and service latencies of this Homelab node',
    systemOperational: 'All systems operational',
    systemDegraded: 'Degraded performance',
    overallLatency: 'Overall latency',
    servicesHealth: 'Services Health & Latencies',
    hardwareTelemetry: 'Live Hardware Telemetry',
    cpuUsage: 'CPU Usage',
    ramUsage: 'RAM Memory',
    diskUsage: 'NVMe Storage',
    temperature: 'Temperature',
    systemUptime: 'System Uptime',
    hostPlatform: 'Host Platform',
    autoRefreshLive: 'Live (5s)',
    refreshNow: 'Refresh',
    viewSystemStatus: 'View System Status',
    footerText: '© 2026 SYS.BLOG • Built for Homelab • Deployed with Docker • React + FastAPI',
  },
  pt: {
    siteTitle: 'SYS.BLOG',
    liveNode: '● Live Node',
    searchPlaceholder: 'Pesquisar por tecnologia ou palavra-chave...',
    authorLogin: 'Entrar / Registrar',
    authorLogout: 'Encerrar Sessão',
    writingStreak: 'DIAS DE SEQUÊNCIA DE ESCRITA',
    activeStatus: 'ATIVA',
    streakDescription: 'Publicando aprendizados contínuos sobre arquitetura, sistemas distribuídos e homelab.',
    postsCount: 'posts',
    upvotesCountBadge: 'upvotes',
    uptimeBadge: 'uptime',
    newPostBtn: 'Novo Post',
    allTopics: 'Todos os temas',
    bookmarksTab: '📌 Salvos',
    clearFilter: '✕ Limpar filtro',
    activeTagFilter: 'Filtrado por',
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
    noBookmarksFound: 'Nenhum artigo salvo ainda',
    noBookmarksSub: 'Clique no ícone de favorito em qualquer post para guardá-lo aqui.',
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
    editPostModalTitle: 'Editar Artigo Técnico',
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
    readingTimeAuto: 'Calculado automaticamente',
    aiReadingTimeNote: 'Tempo de leitura estimado por IA com base na densidade técnica',
    tagsLabel: 'Categorias e Tags',
    searchTagsPlaceholder: 'Pesquisar categoria ou digitar uma nova...',
    createNewTagAction: 'Criar nova categoria',
    suggestTagsAiBtn: '✨ Sugerir com IA',
    suggestingTagsAi: 'Analisando conteúdo...',
    aiSuggestedTagsTitle: 'Sugestões de IA para este artigo:',
    noTagsFound: 'Nenhuma categoria correspondente encontrada. Pressione Enter para criar.',
    selectedTagsCount: 'selecionadas',
    contentMarkdownLabel: 'Conteúdo do Artigo',
    contentMarkdownPlaceholder: '## Minha Arquitetura\n\nExplique aqui os conceitos, diagramas e trechos de código...',
    publishPostBtn: 'Publicar Artigo',
    publishingPost: 'Publicando...',
    saveChangesBtn: 'Salvar Alterações',
    savingChanges: 'Salvando...',
    cancelBtn: 'Cancelar',
    commentsSectionTitle: 'Discussão Técnica e Comentários',
    commentsCount: 'comentários',
    leaveCommentTitle: 'Deixe um comentário ou contribuição',
    commentPlaceholder: 'Escreva suas dúvidas ou observações sobre esta arquitetura...',
    authorNamePlaceholder: 'Seu nome (ex: Engenheiro DevOps)',
    postCommentBtn: 'Publicar Comentário',
    postingComment: 'Enviando...',
    noCommentsYet: 'Ainda não há comentários. Seja o primeiro a iniciar a discussão técnica!',
    editPostBtn: 'Editar',
    deletePostBtn: 'Excluir',
    confirmDeletePost: 'Tem certeza de que deseja excluir permanentemente este artigo?',
    loginTitle: 'Acesso Autor / Painel',
    registerTitle: 'Criar Conta de Leitor',
    fullNameLabel: 'Nome Completo',
    fullNamePlaceholder: 'Alex Developer',
    createAccountBtn: 'Registrar Conta',
    creatingAccount: 'Criando conta...',
    alreadyAccountText: 'Já tem uma conta? Entre aqui',
    needAccountText: 'Não tem conta? Registre-se aqui',
    googleLoginBtn: 'Continuar com Google Workspace',
    tableOfContents: 'Índice de Conteúdo',
    aiTranslateBtn: '⚡ Traduzir com IA',
    translatingWithAi: 'Traduzindo com IA...',
    aiTranslateSuccess: 'Artigo traduzido com sucesso!',
    aiTranslatePrompt: 'Selecione o idioma de destino para autotraducir:',
    editorWriteTab: 'Escrever',
    editorPreviewTab: 'Visualização',
    editorMarkdownHelp: 'Ajuda Markdown',
    toolbarBold: 'Negrito (**texto**)',
    toolbarItalic: 'Itálico (*texto*)',
    toolbarHeading2: 'Título de Seção (##)',
    toolbarHeading3: 'Subtítulo (###)',
    toolbarBulletList: 'Lista com marcadores (-)',
    toolbarNumberedList: 'Lista numerada (1.)',
    toolbarCodeBlock: 'Bloco de código (```)',
    toolbarInlineCode: 'Código em linha (`código`)',
    toolbarQuote: 'Citação / Nota (> Nota)',
    toolbarLink: 'Link ([texto](url))',
    toolbarTable: 'Inserir tabela técnica',
    toolbarDivider: 'Linha divisória (---)',
    toolbarImage: 'Enviar e inserir imagem (JPG, PNG, WEBP, GIF)',
    toolbarImageUploading: 'Enviando imagem...',
    loadMorePosts: 'Carregar mais artigos',
    loadingMorePosts: 'Carregando...',
    showingPostsCount: 'Mostrando {shown} de {total} artigos',
    allSections: 'Tudo',
    sectionsNavLabel: 'Seções do blog',
    sectionLabel: 'Seção',
    sectionPlaceholder: 'Escolha uma seção',
    sectionRequired: 'Escolha a seção do artigo.',
    tagSectionMismatch: '"{tag}" parece ser de {section}, não desta seção.',
    tagCreateInSection: 'Criar em {section}',
    tagCreateAnyway: 'Criar aqui mesmo assim',
    tagCheckingSection: 'Verificando seção...',
    tagOtherSections: 'Outras seções',
    aiUnavailableBanner: 'IA não configurada: a tradução está desativada e as sugestões de tags usam palavras-chave. Configure ANTHROPIC_API_KEY ou GEMINI_API_KEY.',
    aiTranslateUnavailable: 'A tradução requer um provedor de IA configurado',
    keywordSuggestedTagsTitle: 'Sugestões por palavras-chave (sem IA)',
    noTagSuggestions: 'Nenhuma sugestão de tag encontrada para este conteúdo.',
    keywordSuggestedTagsQuota: 'Sugestões por palavras-chave (cota de IA esgotada)',
    aiQuotaExhausted: 'Não foi possível traduzir: a cota gratuita de IA acabou.',
    aiRetryIn: 'Tente novamente em cerca de {minutes} min.',
    aiRetryLater: 'Tente novamente mais tarde.',
    aiTranslateFailed: 'Não foi possível traduzir: o serviço de IA falhou. Tente novamente.',
    editorEmptyPreview: 'O artigo ainda não tem conteúdo. Escreva na aba "Escrever" para ver a pré-visualização.',
    markdownGuideTitle: 'Guia Rápido de Formatação Markdown (Estilo Word)',
    systemStatusBtn: '🖥️ Status (/status)',
    systemStatusTitle: 'Status do Sistema e Telemetria',
    systemStatusSubtitle: 'Métricas de hardware em tempo real e latências do nó Homelab',
    systemOperational: 'Todos os sistemas operacionais',
    systemDegraded: 'Desempenho degradado',
    overallLatency: 'Latência geral',
    servicesHealth: 'Saúde dos Serviços e Latências',
    hardwareTelemetry: 'Telemetria de Hardware em Tempo Real',
    cpuUsage: 'Uso de CPU',
    ramUsage: 'Memória RAM',
    diskUsage: 'Armazenamento NVMe',
    temperature: 'Temperatura',
    systemUptime: 'Tempo de Atividade',
    hostPlatform: 'Plataforma Host',
    autoRefreshLive: 'Ao vivo (5s)',
    refreshNow: 'Atualizar',
    viewSystemStatus: 'Ver Status do Servidor',
    footerText: '© 2026 SYS.BLOG • Projetado para Homelab • Implantado com Docker • React + FastAPI',
  },
  fr: {
    siteTitle: 'SYS.BLOG',
    liveNode: '● Live Node',
    searchPlaceholder: 'Rechercher par technologie ou mot-clé...',
    authorLogin: 'Connexion / Inscription',
    authorLogout: 'Déconnexion',
    writingStreak: 'JOURS DE SÉRIE D\'ÉCRITURE',
    activeStatus: 'ACTIVE',
    streakDescription: 'Partage d\'apprentissages continus sur l\'architecture, les systèmes distribués et le homelab.',
    postsCount: 'articles',
    upvotesCountBadge: 'votes',
    uptimeBadge: 'disponibilité',
    newPostBtn: 'Nouvel Article',
    allTopics: 'Tous les thèmes',
    bookmarksTab: '📌 Enregistrés',
    clearFilter: '✕ Effacer le filtre',
    activeTagFilter: 'Filtré par',
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
    noBookmarksFound: 'Aucun article enregistré pour le moment',
    noBookmarksSub: 'Cliquez sur l\'icône de marque-page sur n\'importe quelle carte pour le retrouver ici.',
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
    editPostModalTitle: 'Modifier l\'Article Technique',
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
    readingTimeAuto: 'Calculé automatiquement',
    aiReadingTimeNote: 'Temps de lecture estimé par l\'IA selon la densité technique',
    tagsLabel: 'Catégories & Tags',
    searchTagsPlaceholder: 'Rechercher une catégorie ou en créer une...',
    createNewTagAction: 'Créer une nouvelle catégorie',
    suggestTagsAiBtn: '✨ Suggérer avec IA',
    suggestingTagsAi: 'Analyse du contenu...',
    aiSuggestedTagsTitle: 'Suggestions IA pour cet article :',
    noTagsFound: 'Aucune catégorie correspondante trouvée. Appuyez sur Entrée pour la créer.',
    selectedTagsCount: 'sélectionnées',
    contentMarkdownLabel: 'Contenu de l\'Article',
    contentMarkdownPlaceholder: '## Architecture\n\nExpliquez ici les concepts, diagrammes et extraits de code...',
    publishPostBtn: 'Publier l\'Article',
    publishingPost: 'Publication en cours...',
    saveChangesBtn: 'Enregistrer les Modifications',
    savingChanges: 'Enregistrement...',
    cancelBtn: 'Annuler',
    commentsSectionTitle: 'Discussion Technique et Commentaires',
    commentsCount: 'commentaires',
    leaveCommentTitle: 'Laisser un commentaire ou une remarque',
    commentPlaceholder: 'Écrivez vos questions ou remarques sur esta architecture...',
    authorNamePlaceholder: 'Votre nom (ex: Ingénieur DevOps)',
    postCommentBtn: 'Publier le Commentaire',
    postingComment: 'Envoi en cours...',
    noCommentsYet: 'Aucun commentaire pour le moment. Soyez le premier à lancer la discussion technique !',
    editPostBtn: 'Modifier',
    deletePostBtn: 'Supprimer',
    confirmDeletePost: 'Êtes-vous sûr de vouloir supprimer définitivement cet article ?',
    loginTitle: 'Accès Auteur / Tableau de Bord',
    registerTitle: 'Créer un Compte Lecteur',
    fullNameLabel: 'Nom Complet',
    fullNamePlaceholder: 'Alex Developer',
    createAccountBtn: 'Créer le Compte',
    creatingAccount: 'Création en cours...',
    alreadyAccountText: 'Vous avez déjà un compte ? Connectez-vous',
    needAccountText: 'Pas encore de compte ? Inscrivez-vous ici',
    googleLoginBtn: 'Continuer avec Google Workspace',
    tableOfContents: 'Table des Matières',
    aiTranslateBtn: '⚡ Traduire avec IA',
    translatingWithAi: 'Traduction avec IA...',
    aiTranslateSuccess: 'Article traduit avec succès !',
    aiTranslatePrompt: 'Sélectionnez la langue cible à traduire :',
    editorWriteTab: 'Écrire',
    editorPreviewTab: 'Aperçu',
    editorMarkdownHelp: 'Aide Markdown',
    toolbarBold: 'Gras (**texte**)',
    toolbarItalic: 'Italique (*texte*)',
    toolbarHeading2: 'Titre de Section (##)',
    toolbarHeading3: 'Sous-titre (###)',
    toolbarBulletList: 'Liste à puces (-)',
    toolbarNumberedList: 'Liste numérotée (1.)',
    toolbarCodeBlock: 'Bloc de code (```)',
    toolbarInlineCode: 'Code en ligne (`code`)',
    toolbarQuote: 'Citation / Note (> Note)',
    toolbarLink: 'Lien ([texte](url))',
    toolbarTable: 'Insérer un tableau technique',
    toolbarDivider: 'Ligne de séparation (---)',
    toolbarImage: 'Téléverser et insérer une image (JPG, PNG, WEBP, GIF)',
    toolbarImageUploading: "Téléversement de l'image...",
    loadMorePosts: "Charger plus d'articles",
    loadingMorePosts: 'Chargement...',
    showingPostsCount: 'Affichage de {shown} sur {total} articles',
    allSections: 'Tout',
    sectionsNavLabel: 'Sections du blog',
    sectionLabel: 'Section',
    sectionPlaceholder: 'Choisissez une section',
    sectionRequired: "Choisissez la section de l'article.",
    tagSectionMismatch: '« {tag} » semble appartenir à {section}, pas à cette section.',
    tagCreateInSection: 'Créer dans {section}',
    tagCreateAnyway: 'Créer ici quand même',
    tagCheckingSection: 'Vérification de la section...',
    tagOtherSections: 'Autres sections',
    aiUnavailableBanner: "IA non configurée : la traduction est désactivée et les suggestions de tags utilisent des mots-clés. Configurez ANTHROPIC_API_KEY ou GEMINI_API_KEY.",
    aiTranslateUnavailable: 'La traduction nécessite un fournisseur IA configuré',
    keywordSuggestedTagsTitle: 'Suggestions par mots-clés (sans IA)',
    noTagSuggestions: 'Aucune suggestion de tag trouvée pour ce contenu.',
    keywordSuggestedTagsQuota: 'Suggestions par mots-clés (quota IA épuisé)',
    aiQuotaExhausted: "Traduction impossible : le quota gratuit d'IA est épuisé.",
    aiRetryIn: 'Réessayez dans environ {minutes} min.',
    aiRetryLater: 'Réessayez plus tard.',
    aiTranslateFailed: "Traduction impossible : le service d'IA a échoué. Réessayez.",
    editorEmptyPreview: 'L\'article n\'a pas encore de contenu. Écrivez dans l\'onglet "Écrire" pour voir l\'aperçu.',
    markdownGuideTitle: 'Guide Rapide de Formatage Markdown (Style Word)',
    systemStatusBtn: '🖥️ Statut (/status)',
    systemStatusTitle: 'Statut du Système & Télémétrie',
    systemStatusSubtitle: 'Métriques matérielles en direct et latences du nœud Homelab',
    systemOperational: 'Tous les systèmes sont opérationnels',
    systemDegraded: 'Performances dégradées',
    overallLatency: 'Latence globale',
    servicesHealth: 'Santé des Services & Latences',
    hardwareTelemetry: 'Télémétrie Matérielle en Direct',
    cpuUsage: 'Utilisation CPU',
    ramUsage: 'Mémoire RAM',
    diskUsage: 'Stockage NVMe',
    temperature: 'Température',
    systemUptime: 'Temps de Fonctionnement',
    hostPlatform: 'Plateforme Hôte',
    autoRefreshLive: 'En direct (5s)',
    refreshNow: 'Actualiser',
    viewSystemStatus: 'Voir l\'État du Serveur',
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
