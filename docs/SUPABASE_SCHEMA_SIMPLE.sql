-- ============================================================================
-- YAVLGOLD ACADEMIA - SCHEMA SIMPLIFICADO (SIN CONFLICTOS)
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- PASO 1: Crear tabla user_profiles (academia)
-- Nota: Usamos nombre diferente para evitar conflicto con "profiles" existente
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    xp_points INTEGER DEFAULT 0,
    current_level TEXT DEFAULT 'Novice',
    study_streak_days INTEGER DEFAULT 0,
    last_study_date DATE,
    total_study_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 2: Crear tabla modules
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_number INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    difficulty_level TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    estimated_hours INTEGER,
    icon TEXT,
    color_theme TEXT,
    order_index INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 3: Crear tabla lessons
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content_html TEXT,
    video_url TEXT,
    estimated_minutes INTEGER,
    xp_reward INTEGER DEFAULT 10,
    order_index INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(module_id, lesson_number)
);

-- PASO 4: Crear tabla quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score_percentage INTEGER DEFAULT 80,
    max_attempts INTEGER DEFAULT 3,
    xp_reward INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 5: Crear tabla quiz_questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 6: Crear tabla user_lesson_progress
CREATE TABLE IF NOT EXISTS user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- PASO 7: Crear tabla user_quiz_attempts
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score_percentage INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    answers JSONB,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 8: Crear tabla badges
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    xp_reward INTEGER DEFAULT 0,
    rarity TEXT DEFAULT 'common',
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 9: Crear tabla user_badges
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- PASO 10: Crear tabla certificates
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    certificate_type TEXT DEFAULT 'completion',
    score_percentage INTEGER,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nft_token_id TEXT,
    nft_contract_address TEXT,
    blockchain_tx_hash TEXT,
    metadata_ipfs_url TEXT,
    UNIQUE(user_id, module_id, certificate_type)
);

-- ============================================================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_xp ON user_profiles(xp_points DESC);
CREATE INDEX IF NOT EXISTS idx_modules_published ON modules(is_published, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_quiz ON user_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Perfiles públicos visibles" ON user_profiles;
DROP POLICY IF EXISTS "Usuarios actualizan su perfil" ON user_profiles;
DROP POLICY IF EXISTS "Usuarios crean su perfil" ON user_profiles;

CREATE POLICY "Perfiles públicos visibles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios actualizan su perfil" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuarios crean su perfil" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- modules
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Módulos publicados son públicos" ON modules;
CREATE POLICY "Módulos publicados son públicos" ON modules FOR SELECT USING (is_published = true);

-- lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecciones publicadas son públicas" ON lessons;
CREATE POLICY "Lecciones publicadas son públicas" ON lessons FOR SELECT USING (is_published = true);

-- quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quizzes son públicos" ON quizzes;
CREATE POLICY "Quizzes son públicos" ON quizzes FOR SELECT USING (true);

-- quiz_questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Preguntas de quiz son públicas" ON quiz_questions;
CREATE POLICY "Preguntas de quiz son públicas" ON quiz_questions FOR SELECT USING (true);

-- user_lesson_progress
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario ve su progreso" ON user_lesson_progress;
DROP POLICY IF EXISTS "Usuario actualiza su progreso" ON user_lesson_progress;
DROP POLICY IF EXISTS "Usuario modifica su progreso" ON user_lesson_progress;

CREATE POLICY "Usuario ve su progreso" ON user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuario actualiza su progreso" ON user_lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario modifica su progreso" ON user_lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- user_quiz_attempts
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario ve sus intentos" ON user_quiz_attempts;
DROP POLICY IF EXISTS "Usuario registra intentos" ON user_quiz_attempts;

CREATE POLICY "Usuario ve sus intentos" ON user_quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuario registra intentos" ON user_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Badges son públicos" ON badges;
CREATE POLICY "Badges son públicos" ON badges FOR SELECT USING (true);

-- user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Badges de usuario son públicos" ON user_badges;
DROP POLICY IF EXISTS "Usuario obtiene badge" ON user_badges;

CREATE POLICY "Badges de usuario son públicos" ON user_badges FOR SELECT USING (true);
CREATE POLICY "Usuario obtiene badge" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- certificates
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Certificados son públicos" ON certificates;
CREATE POLICY "Certificados son públicos" ON certificates FOR SELECT USING (true);

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

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

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

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

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Contar tablas creadas
SELECT COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_profiles', 'modules', 'lessons', 'quizzes', 
    'quiz_questions', 'user_lesson_progress', 
    'user_quiz_attempts', 'badges', 'user_badges', 'certificates'
  );

-- Resultado esperado: 10
