const ROOT_FOLDER_DEFINITIONS = [
    {
        key: 'mi-finca',
        label: 'Mi Finca',
        iconClass: 'fa-solid fa-house-chimney-window',
        accentToken: 'var(--gold-4)',
        seedFiles: [{ title: 'finca.md', templateKey: 'mi-finca' }]
    },
    {
        key: 'cultivos',
        label: 'Cultivos',
        iconClass: 'fa-solid fa-seedling',
        accentToken: 'var(--gold-5)'
    },
    {
        key: 'observaciones',
        label: 'Observaciones',
        iconClass: 'fa-solid fa-binoculars',
        accentToken: 'var(--gold-4)'
    },
    {
        key: 'incidencias',
        label: 'Incidencias',
        iconClass: 'fa-solid fa-triangle-exclamation',
        accentToken: 'var(--color-error)'
    },
    {
        key: 'decisiones',
        label: 'Decisiones',
        iconClass: 'fa-solid fa-gavel',
        accentToken: 'var(--color-success)'
    },
    {
        key: 'pruebas',
        label: 'Pruebas',
        iconClass: 'fa-solid fa-flask-vial',
        accentToken: 'var(--color-info)'
    },
    {
        key: 'mercado',
        label: 'Mercado',
        iconClass: 'fa-solid fa-store',
        accentToken: 'var(--gold-3)'
    }
];

const TEMPLATE_DEFINITIONS = [
    {
        key: 'mi-finca',
        label: 'Mi Finca',
        shortLabel: 'Mi Finca',
        folderKey: 'mi-finca',
        iconClass: 'fa-solid fa-house-chimney-window',
        accentToken: 'var(--gold-4)',
        defaultTitle: 'finca.md',
        description: 'Ficha viva del contexto base de la finca.',
        seedContent: `# Mi Finca

## Estado actual
- Ubicacion:
- Cultivos activos:
- Prioridades de esta semana:

## Contexto operativo
- Agua y riego:
- Mano de obra:
- Riesgos visibles:

## Pendientes
- [ ]`
    },
    {
        key: 'observacion',
        label: 'Observacion',
        shortLabel: 'Observacion',
        folderKey: 'observaciones',
        iconClass: 'fa-solid fa-binoculars',
        accentToken: 'var(--gold-4)',
        defaultTitle: 'observacion.md',
        description: 'Hallazgo rapido del dia a dia.',
        seedContent: `# Observacion

## Que vi

## Donde

## Proximo paso`
    },
    {
        key: 'incidencia',
        label: 'Incidencia',
        shortLabel: 'Incidencia',
        folderKey: 'incidencias',
        iconClass: 'fa-solid fa-triangle-exclamation',
        accentToken: 'var(--color-error)',
        defaultTitle: 'incidencia.md',
        description: 'Problema operativo que requiere seguimiento.',
        seedContent: `# Incidencia

## Sintoma

## Impacto

## Accion tomada`
    },
    {
        key: 'decision',
        label: 'Decision',
        shortLabel: 'Decision',
        folderKey: 'decisiones',
        iconClass: 'fa-solid fa-gavel',
        accentToken: 'var(--color-success)',
        defaultTitle: 'decision.md',
        description: 'Decision tomada y su razon.',
        seedContent: `# Decision

## Decision tomada

## Motivo

## Revision pendiente`
    },
    {
        key: 'prueba',
        label: 'Prueba',
        shortLabel: 'Prueba',
        folderKey: 'pruebas',
        iconClass: 'fa-solid fa-flask-vial',
        accentToken: 'var(--color-info)',
        defaultTitle: 'prueba.md',
        description: 'Ensayo corto, aprendizaje o experimento.',
        seedContent: `# Prueba

## Hipotesis

## Que se hizo

## Resultado`
    },
    {
        key: 'nota-libre',
        label: 'Nota libre',
        shortLabel: 'Libre',
        folderKey: 'mi-finca',
        iconClass: 'fa-regular fa-note-sticky',
        accentToken: 'var(--text-secondary)',
        defaultTitle: 'nota-libre.md',
        description: 'Apunte simple sin estructura fija.',
        seedContent: `# Nota libre

`
    }
];

const ROOT_FOLDER_INDEX = new Map(ROOT_FOLDER_DEFINITIONS.map((folder) => [folder.key, folder]));
const ROOT_FOLDER_LABEL_INDEX = new Map(ROOT_FOLDER_DEFINITIONS.map((folder) => [folder.label.toLowerCase(), folder]));
const TEMPLATE_INDEX = new Map(TEMPLATE_DEFINITIONS.map((template) => [template.key, template]));

const LEGACY_TYPE_MAP = {
    observacion: 'observacion',
    decision: 'decision',
    problema: 'incidencia',
    aprendizaje: 'prueba',
    evento: 'nota-libre'
};

const ROOT_FOLDER_ALIASES = {
    finca: 'mi-finca',
    perfil: 'mi-finca',
    'perfil agro': 'mi-finca',
    cultivos: 'cultivos',
    cultivo: 'cultivos',
    observaciones: 'observaciones',
    observacion: 'observaciones',
    incidencias: 'incidencias',
    incidencia: 'incidencias',
    decisiones: 'decisiones',
    decision: 'decisiones',
    pruebas: 'pruebas',
    prueba: 'pruebas',
    mercado: 'mercado',
    compradores: 'mercado'
};

export const AGRO_REPO_ROOT_FOLDERS = ROOT_FOLDER_DEFINITIONS.map((folder) => ({ ...folder }));
export const AGRO_REPO_TEMPLATES = TEMPLATE_DEFINITIONS.map((template) => ({ ...template }));

export function getRootFolder(key) {
    return ROOT_FOLDER_INDEX.get(key) || ROOT_FOLDER_INDEX.get('mi-finca');
}

export function resolveRootFolderKey(value) {
    const safe = String(value || '').trim().toLowerCase();
    if (!safe) return '';
    if (ROOT_FOLDER_INDEX.has(safe)) return safe;
    if (ROOT_FOLDER_LABEL_INDEX.has(safe)) return ROOT_FOLDER_LABEL_INDEX.get(safe).key;
    return ROOT_FOLDER_ALIASES[safe] || '';
}

export function getTemplate(key) {
    return TEMPLATE_INDEX.get(key) || TEMPLATE_INDEX.get('nota-libre');
}

export function normalizeTemplateKey(key) {
    return getTemplate(key).key;
}

export function getTemplateLabel(key) {
    return getTemplate(key).label;
}

export function getTemplateSeed(key) {
    return getTemplate(key).seedContent;
}

export function getTemplateFolderKey(key) {
    return getTemplate(key).folderKey;
}

export function inferTemplateKeyFromLegacy(value) {
    const safe = String(value || '').trim().toLowerCase();
    return LEGACY_TYPE_MAP[safe] || 'nota-libre';
}
