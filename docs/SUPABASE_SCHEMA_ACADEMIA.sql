-- ============================================================================
-- YAVLGOLD ACADEMIA - SCHEMA DE BASE DE DATOS
-- Basado en roadmap: Sistema de progreso, gamificación y certificaciones
-- Fecha: Octubre 2025
-- ============================================================================

-- ====================
-- TABLA: user_profiles
-- ====================
-- Perfil extendido de usuario con datos académicos
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    xp_points INTEGER DEFAULT 0,
    current_level TEXT DEFAULT 'Novice', -- Novice, Adept, Expert, Master
    study_streak_days INTEGER DEFAULT 0,
    last_study_date DATE,
    total_study_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_xp ON user_profiles(xp_points DESC);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver todos los perfiles (para leaderboard)
CREATE POLICY "Perfiles públicos visibles" ON user_profiles
    FOR SELECT USING (true);

-- Los usuarios solo pueden actualizar su propio perfil
CREATE POLICY "Usuarios actualizan su perfil" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Los usuarios pueden insertar su perfil
CREATE POLICY "Usuarios crean su perfil" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);


-- ====================
-- TABLA: modules
-- ====================
-- Módulos de la academia (ej: "Fundamentos Bitcoin", "DeFi Masterclass")
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_number INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    difficulty_level TEXT NOT NULL, -- beginner, intermediate, advanced, expert
    is_premium BOOLEAN DEFAULT false,
    estimated_hours INTEGER,
    icon TEXT, -- Font Awesome icon class
    color_theme TEXT, -- Para UI (ej: "#C8A752")
    order_index INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_modules_published ON modules(is_published, order_index);

-- RLS: Todos pueden ver módulos publicados
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Módulos publicados son públicos" ON modules
    FOR SELECT USING (is_published = true);


-- ====================
-- TABLA: lessons
-- ====================
-- Lecciones individuales dentro de cada módulo
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content_html TEXT, -- Contenido de la lección
    video_url TEXT, -- URL de Cloudflare Stream o YouTube
    estimated_minutes INTEGER,
    xp_reward INTEGER DEFAULT 10,
    order_index INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(module_id, lesson_number)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, order_index);

-- RLS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecciones publicadas son públicas" ON lessons
    FOR SELECT USING (is_published = true);


-- ====================
-- TABLA: quizzes
-- ====================
-- Quizzes al final de cada lección
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score_percentage INTEGER DEFAULT 80,
    max_attempts INTEGER DEFAULT 3, -- null = ilimitado
    xp_reward INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id);

-- RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quizzes son públicos" ON quizzes
    FOR SELECT USING (true);


-- ====================
-- TABLA: quiz_questions
-- ====================
-- Preguntas de cada quiz
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice', -- multiple_choice, true_false
    options JSONB NOT NULL, -- Array de opciones ["opción1", "opción2", ...]
    correct_answer TEXT NOT NULL, -- Índice de la respuesta correcta o "true"/"false"
    explanation TEXT, -- Explicación de por qué es correcta
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id, order_index);

-- RLS
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Preguntas de quiz son públicas" ON quiz_questions
    FOR SELECT USING (true);


-- ====================
-- TABLA: user_lesson_progress
-- ====================
-- Tracking de progreso por lección
CREATE TABLE IF NOT EXISTS user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed
    progress_percentage INTEGER DEFAULT 0, -- 0-100
    time_spent_minutes INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_status ON user_lesson_progress(user_id, status);

-- RLS
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven su propio progreso
CREATE POLICY "Usuario ve su progreso" ON user_lesson_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios solo actualizan su propio progreso
CREATE POLICY "Usuario actualiza su progreso" ON user_lesson_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuario modifica su progreso" ON user_lesson_progress
    FOR UPDATE USING (auth.uid() = user_id);


-- ====================
-- TABLA: user_quiz_attempts
-- ====================
-- Intentos de quiz de cada usuario
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score_percentage INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    answers JSONB, -- Respuestas del usuario { "question_id": "answer", ... }
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_quiz ON user_quiz_attempts(quiz_id);

-- RLS
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve sus intentos" ON user_quiz_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuario registra intentos" ON user_quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ====================
-- TABLA: badges
-- ====================
-- Badges/logros disponibles
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_key TEXT UNIQUE NOT NULL, -- primer_curso, racha_7_dias, quiz_perfecto_5
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Font Awesome icon
    color TEXT, -- Color del badge
    xp_reward INTEGER DEFAULT 0,
    rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
    criteria JSONB, -- Criterios para obtenerlo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges son públicos" ON badges
    FOR SELECT USING (true);


-- ====================
-- TABLA: user_badges
-- ====================
-- Badges obtenidos por usuarios
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges de usuario son públicos" ON user_badges
    FOR SELECT USING (true);

CREATE POLICY "Usuario obtiene badge" ON user_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ====================
-- TABLA: certificates
-- ====================
-- Certificados obtenidos (pre-NFT, luego se mintearán en Polygon)
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    certificate_type TEXT DEFAULT 'completion', -- completion, excellence
    score_percentage INTEGER,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nft_token_id TEXT, -- ID del NFT cuando se mintee (Fase 2)
    nft_contract_address TEXT,
    blockchain_tx_hash TEXT,
    metadata_ipfs_url TEXT,
    UNIQUE(user_id, module_id, certificate_type)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_nft ON certificates(nft_token_id);

-- RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificados son públicos" ON certificates
    FOR SELECT USING (true);


-- ====================
-- FUNCIONES ÚTILES
-- ====================

-- Función para calcular nivel basado en XP
CREATE OR REPLACE FUNCTION calculate_user_level(xp INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF xp < 100 THEN RETURN 'Novice';
    ELSIF xp < 500 THEN RETURN 'Adept';
    ELSIF xp < 1000 THEN RETURN 'Expert';
    ELSE RETURN 'Master';
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Función para actualizar nivel automáticamente
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    NEW.current_level := calculate_user_level(NEW.xp_points);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar nivel cuando cambia XP
DROP TRIGGER IF EXISTS trigger_update_user_level ON user_profiles;
CREATE TRIGGER trigger_update_user_level
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    WHEN (OLD.xp_points IS DISTINCT FROM NEW.xp_points)
    EXECUTE FUNCTION update_user_level();


-- Función para actualizar racha de días
CREATE OR REPLACE FUNCTION update_study_streak()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es el primer registro del día
    IF NEW.last_study_date IS NULL OR NEW.last_study_date < CURRENT_DATE THEN
        -- Si estudió ayer, incrementa racha
        IF NEW.last_study_date = CURRENT_DATE - INTERVAL '1 day' THEN
            NEW.study_streak_days := NEW.study_streak_days + 1;
        -- Si rompió la racha, resetea
        ELSIF NEW.last_study_date < CURRENT_DATE - INTERVAL '1 day' THEN
            NEW.study_streak_days := 1;
        END IF;
        
        NEW.last_study_date := CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ====================
-- DATOS INICIALES
-- ====================

-- Insertar badges básicos
INSERT INTO badges (badge_key, title, description, icon, color, xp_reward, rarity) VALUES
    ('primer_curso', 'Primer Paso', 'Completaste tu primera lección', 'fa-graduation-cap', '#4CAF50', 10, 'common'),
    ('racha_7_dias', 'Dedicación Total', 'Estudiaste 7 días seguidos', 'fa-fire', '#FF5722', 25, 'rare'),
    ('quiz_perfecto', 'Cerebro de Oro', 'Sacaste 100% en un quiz', 'fa-star', '#C8A752', 15, 'rare'),
    ('quiz_perfecto_5', 'Genio Académico', '5 quizzes perfectos', 'fa-crown', '#C8A752', 50, 'epic'),
    ('modulo_completo', 'Maestro del Módulo', 'Completaste un módulo completo', 'fa-trophy', '#FF9800', 100, 'epic'),
    ('early_adopter', 'Pionero YavlGold', 'Uno de los primeros 100 estudiantes', 'fa-rocket', '#9C27B0', 50, 'legendary')
ON CONFLICT (badge_key) DO NOTHING;


-- Insertar Módulo 1: Fundamentos Bitcoin
INSERT INTO modules (module_number, title, description, difficulty_level, is_premium, estimated_hours, icon, color_theme, order_index, is_published) VALUES
    (1, 'Fundamentos Bitcoin', '¿Qué es Bitcoin y por qué existe? Aprende los conceptos básicos que todo crypto nativo debe conocer.', 'beginner', false, 3, 'fa-bitcoin-sign', '#F7931A', 1, true)
ON CONFLICT (module_number) DO NOTHING;

-- Insertar Módulo 4: Seguridad Cripto
INSERT INTO modules (module_number, title, description, difficulty_level, is_premium, estimated_hours, icon, color_theme, order_index, is_published) VALUES
    (4, 'Seguridad Cripto', 'Protege tus activos digitales. Hardware wallets, seed phrases y detección de scams.', 'beginner', false, 2, 'fa-shield-halved', '#4CAF50', 4, true)
ON CONFLICT (module_number) DO NOTHING;


-- ====================
-- COMENTARIOS FINALES
-- ====================
-- Este schema soporta:
-- ✅ Sistema de progreso por lección
-- ✅ Quizzes interactivos con múltiples intentos
-- ✅ Sistema XP y niveles (Novice → Master)
-- ✅ Badges/logros gamificados
-- ✅ Certificados (pre-NFT para Fase 2)
-- ✅ Tracking de racha de estudio
-- ✅ Leaderboard (por XP)
-- ✅ Preparado para Fase 2: NFT certificates en Polygon
