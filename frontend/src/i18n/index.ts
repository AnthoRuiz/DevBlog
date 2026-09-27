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
  tagsLabel: string;
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
    tagsLabel: 'Categorías y Tags',
    contentMarkdownLabel: 'Contenido en Markdown',
    contentMarkdownPlaceholder: '# Mi Arquitectura\n\nExplica aquí los conceptos, diagramas y fragmentos de código...',
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
    aiTranslateBtn: '⚡ Traducir con IA (Gemini)',
    translatingWithAi: 'Traduciendo con Gemini...',
    aiTranslateSuccess: '¡Artículo traducido exitosamente!',
    aiTranslatePrompt: 'Selecciona el idioma de destino para autotraducir:',
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
    tagsLabel: 'Categories & Tags',
    contentMarkdownLabel: 'Markdown Content',
    contentMarkdownPlaceholder: '# Architecture Overview\n\nExplain concepts, system diagrams, and code snippets...',
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
    aiTranslateBtn: '⚡ Translate with AI (Gemini)',
    translatingWithAi: 'Translating with Gemini...',
    aiTranslateSuccess: 'Article translated successfully!',
    aiTranslatePrompt: 'Select target language to auto-translate:',
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
    tagsLabel: 'Categorias e Tags',
    contentMarkdownLabel: 'Conteúdo em Markdown',
    contentMarkdownPlaceholder: '# Minha Arquitetura\n\nExplique aqui os conceitos, diagramas e trechos de código...',
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
    aiTranslateBtn: '⚡ Traduzir com IA (Gemini)',
    translatingWithAi: 'Traduzindo com Gemini...',
    aiTranslateSuccess: 'Artigo traduzido com sucesso!',
    aiTranslatePrompt: 'Selecione o idioma de destino para autotraduzir:',
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
    tagsLabel: 'Catégories & Tags',
    contentMarkdownLabel: 'Contenu Markdown',
    contentMarkdownPlaceholder: '# Architecture\n\nExpliquez ici les concepts, diagrammes et extraits de code...',
    publishPostBtn: 'Publier l\'Article',
    publishingPost: 'Publication en cours...',
    saveChangesBtn: 'Enregistrer les Modifications',
    savingChanges: 'Enregistrement...',
    cancelBtn: 'Annuler',
    commentsSectionTitle: 'Discussion Technique et Commentaires',
    commentsCount: 'commentaires',
    leaveCommentTitle: 'Laisser un commentaire ou une remarque',
    commentPlaceholder: 'Écrivez vos questions ou remarques sur cette architecture...',
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
    aiTranslateBtn: '⚡ Traduire avec IA (Gemini)',
    translatingWithAi: 'Traduction avec Gemini...',
    aiTranslateSuccess: 'Article traduit avec succès !',
    aiTranslatePrompt: 'Sélectionnez la langue cible à traduire :',
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
