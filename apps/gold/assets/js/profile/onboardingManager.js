import { supabase } from '../config/supabase-config.js';
import { logger } from '../utils/logger.js';

const TABLE_NAME = 'user_onboarding_context';
const ONBOARDING_COLUMNS = [
  'user_id',
  'display_name',
  'agro_relation',
  'farm_name',
  'main_activity',
  'entry_preference',
  'onboarding_completed',
  'created_at',
  'updated_at'
].join(', ');

export const ONBOARDING_RELATION_OPTIONS = Object.freeze([
  {
    value: 'producer',
    label: 'Trabajo activamente en Agro',
    shortLabel: 'Productor activo',
    description: 'Gestionas cultivos, ventas o seguimiento en el campo.'
  },
  {
    value: 'supporting',
    label: 'Acompaño o administro una finca',
    shortLabel: 'Gestión o apoyo',
    description: 'Das soporte operativo, comercial o administrativo.'
  },
  {
    value: 'exploring',
    label: 'Estoy explorando por ahora',
    shortLabel: 'Explorando',
    description: 'Quieres entender el flujo antes de operar a fondo.'
  }
]);

export const ONBOARDING_ACTIVITY_OPTIONS = Object.freeze([
  {
    value: 'cultivation',
    label: 'Cultivos y seguimiento',
    description: 'Quiero controlar siembra, avances y estado productivo.'
  },
  {
    value: 'sales',
    label: 'Ventas y cartera',
    description: 'Me importa cobrar, vender y ordenar clientes.'
  },
  {
    value: 'planning',
    label: 'Clima y planificación',
    description: 'Necesito decidir mejor el día a día del campo.'
  },
  {
    value: 'learning',
    label: 'Aprender primero',
    description: 'Prefiero conocer el sistema antes de mover datos reales.'
  },
  {
    value: 'other',
    label: 'Estoy definiéndolo',
    description: 'Todavía estoy ajustando mi foco principal.'
  }
]);

export const ONBOARDING_ENTRY_OPTIONS = Object.freeze([
  {
    value: 'agro_dashboard',
    label: 'Ver mi resumen primero',
    description: 'Entrar por un panorama general y continuar desde allí.'
  },
  {
    value: 'agro_operations',
    label: 'Ir directo a operaciones',
    description: 'Abrir Agro con foco práctico y de ejecución.'
  },
  {
    value: 'agro_reports',
    label: 'Revisar resultados',
    description: 'Priorizar reportes, contexto y lectura rápida.'
  },
  {
    value: 'learning_path',
    label: 'Arrancar con guía',
    description: 'Tener una entrada más guiada para entender la plataforma.'
  }
]);

function getDefaultContext(userId = null) {
  return {
    userId,
    displayName: '',
    agroRelation: '',
    farmName: '',
    mainActivity: '',
    entryPreference: '',
    onboardingCompleted: false,
    createdAt: null,
    updatedAt: null
  };
}

function trimText(value, maxLength) {
  const safeValue = typeof value === 'string' ? value.trim() : '';
  if (!safeValue) return '';
  return safeValue.slice(0, maxLength);
}

function normalizeEnum(value, options) {
  return options.some((option) => option.value === value) ? value : '';
}

function toClientContext(record, userId = null) {
  const base = getDefaultContext(userId || record?.user_id || null);
  if (!record) return base;

  return {
    userId: record.user_id || base.userId,
    displayName: record.display_name || '',
    agroRelation: record.agro_relation || '',
    farmName: record.farm_name || '',
    mainActivity: record.main_activity || '',
    entryPreference: record.entry_preference || '',
    onboardingCompleted: Boolean(record.onboarding_completed),
    createdAt: record.created_at || null,
    updatedAt: record.updated_at || null
  };
}

function toDbPayload(input, userId) {
  const displayName = trimText(input?.displayName, 80);
  const agroRelation = normalizeEnum(input?.agroRelation, ONBOARDING_RELATION_OPTIONS);
  const farmName = trimText(input?.farmName, 120);
  const mainActivity = normalizeEnum(input?.mainActivity, ONBOARDING_ACTIVITY_OPTIONS);
  const entryPreference = normalizeEnum(input?.entryPreference, ONBOARDING_ENTRY_OPTIONS);

  return {
    user_id: userId,
    display_name: displayName,
    agro_relation: agroRelation,
    farm_name: farmName || null,
    main_activity: mainActivity || null,
    entry_preference: entryPreference,
    onboarding_completed: Boolean(input?.onboardingCompleted)
  };
}

function validatePayload(payload) {
  if (!payload.display_name || payload.display_name.length < 2) {
    return 'Necesitamos un nombre corto para continuar.';
  }

  if (!payload.agro_relation) {
    return 'Selecciona cómo te relacionas con Agro.';
  }

  if (!payload.main_activity) {
    return 'Selecciona la actividad principal que más te interesa.';
  }

  if (!payload.entry_preference) {
    return 'Selecciona cómo prefieres empezar.';
  }

  return null;
}

async function resolveUserId(explicitUserId) {
  if (explicitUserId) return explicitUserId;

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    logger.error('[OnboardingManager] No se pudo resolver la sesión:', error.message);
    return null;
  }
}

function getOptionByValue(options, value) {
  return options.find((option) => option.value === value) || null;
}

export function getOnboardingLabel(type, value) {
  const maps = {
    relation: ONBOARDING_RELATION_OPTIONS,
    activity: ONBOARDING_ACTIVITY_OPTIONS,
    entry: ONBOARDING_ENTRY_OPTIONS
  };

  const option = getOptionByValue(maps[type] || [], value);
  return option?.label || '';
}

export function buildOnboardingHeroSubtitle(context) {
  if (!context?.onboardingCompleted) {
    return 'Tu finca digital. Gestiona cultivos, controla ventas y planifica tu campo.';
  }

  const relation = getOptionByValue(ONBOARDING_RELATION_OPTIONS, context.agroRelation);
  const entry = getOptionByValue(ONBOARDING_ENTRY_OPTIONS, context.entryPreference);

  const relationCopy = relation?.shortLabel || 'Tu contexto';
  const entryCopy = entry?.label || 'Tu siguiente paso';
  return `${relationCopy}. ${entryCopy}.`;
}

export const OnboardingManager = {
  async getOnboardingContext(userId) {
    const resolvedUserId = await resolveUserId(userId);

    if (!resolvedUserId) {
      return {
        success: false,
        error: 'No hay sesión activa.',
        context: getDefaultContext()
      };
    }

    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(ONBOARDING_COLUMNS)
        .eq('user_id', resolvedUserId)
        .maybeSingle();

      if (error) {
        logger.error('[OnboardingManager] Error consultando onboarding:', error.message);
        return {
          success: false,
          error: error.message,
          context: getDefaultContext(resolvedUserId)
        };
      }

      if (!data) {
        return {
          success: true,
          exists: false,
          context: getDefaultContext(resolvedUserId)
        };
      }

      return {
        success: true,
        exists: true,
        context: toClientContext(data, resolvedUserId)
      };
    } catch (error) {
      logger.error('[OnboardingManager] Error inesperado leyendo onboarding:', error.message);
      return {
        success: false,
        error: error.message,
        context: getDefaultContext(resolvedUserId)
      };
    }
  },

  async hasCompletedOnboarding(userId) {
    const result = await this.getOnboardingContext(userId);
    return {
      success: result.success,
      completed: Boolean(result.context?.onboardingCompleted),
      context: result.context,
      error: result.error || null
    };
  },

  async saveOnboardingContext(input, userId) {
    const resolvedUserId = await resolveUserId(userId);

    if (!resolvedUserId) {
      return {
        success: false,
        error: 'No hay sesión activa para guardar onboarding.'
      };
    }

    const payload = toDbPayload(input, resolvedUserId);
    const validationError = validatePayload(payload);

    if (validationError) {
      return {
        success: false,
        error: validationError
      };
    }

    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .upsert(payload, { onConflict: 'user_id' })
        .select(ONBOARDING_COLUMNS)
        .single();

      if (error) {
        logger.error('[OnboardingManager] Error guardando onboarding:', error.message);
        return {
          success: false,
          error: error.message
        };
      }

      logger.success('[OnboardingManager] Onboarding guardado');
      return {
        success: true,
        context: toClientContext(data, resolvedUserId)
      };
    } catch (error) {
      logger.error('[OnboardingManager] Error inesperado guardando onboarding:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

window.OnboardingManager = OnboardingManager;

export default OnboardingManager;
