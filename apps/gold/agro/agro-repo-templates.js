const TEMPLATE_DEFINITIONS = [
    {
        key: 'mi-finca',
        label: 'Mi Finca',
        shortLabel: 'Mi Finca',
        iconClass: 'fa-solid fa-house-chimney-window',
        accentToken: 'var(--gold-4)',
        defaultTitle: 'mi-finca.md',
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
        iconClass: 'fa-regular fa-note-sticky',
        accentToken: 'var(--text-secondary)',
        defaultTitle: 'nota-libre.md',
        description: 'Apunte simple sin estructura fija.',
        seedContent: `# Nota libre

`
    }
];

const TEMPLATE_INDEX = new Map(TEMPLATE_DEFINITIONS.map((template) => [template.key, template]));

const LEGACY_TYPE_MAP = {
    observacion: 'observacion',
    decision: 'decision',
    problema: 'incidencia',
    aprendizaje: 'prueba',
    evento: 'nota-libre'
};

export const AGRO_REPO_TEMPLATES = TEMPLATE_DEFINITIONS.map((template) => ({ ...template }));

export const AGRO_REPO_SECTIONS = [
    { key: 'all', label: 'Todas' },
    ...AGRO_REPO_TEMPLATES.map((template) => ({ key: template.key, label: template.shortLabel }))
];

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

export function inferTemplateKeyFromLegacy(value) {
    const safe = String(value || '').trim().toLowerCase();
    return LEGACY_TYPE_MAP[safe] || 'nota-libre';
}
