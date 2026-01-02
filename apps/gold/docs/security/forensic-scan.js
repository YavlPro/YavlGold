/**
 * YavlGold Forensic Security Scanner
 * ===================================
 *
 * Script para verificar integridad del código servido en producción.
 * Ejecutar en la consola del navegador (F12 > Console) estando en el sitio.
 *
 * @version 1.0.0
 * @date 2025-01-01
 * @author YavlGold Security Team
 *
 * INSTRUCCIONES:
 * 1. Abrir el sitio en producción (ej: https://tu-dominio.vercel.app)
 * 2. Abrir DevTools (F12) > Console
 * 3. Copiar y pegar todo este script
 * 4. Presionar Enter
 * 5. Si todo está limpio, verás "✅ CÓDIGO LIMPIO"
 */

(async function forensicScan() {
    console.clear();
    console.log('%c🔬 INICIANDO ESCANEO FORENSE', 'font-size: 18px; font-weight: bold; color: #FFD700;');
    console.log('━'.repeat(50));

    // Patrones sospechosos a buscar
    const DANGER_PATTERNS = [
        // Backdoors conocidos
        /pass\s*===\s*['"`]123['"`]/gi,
        /admin\s*&&\s*pass\s*===\s*['"`]\d{3}['"`]/gi,
        /superadmin/gi,
        /backdoor/gi,

        // Credenciales hardcodeadas
        /password\s*[:=]\s*['"`][^'"]+['"`]/gi,
        /api[_-]?key\s*[:=]\s*['"`][a-zA-Z0-9]{20,}['"`]/gi,
        /secret[_-]?key\s*[:=]\s*['"`]/gi,

        // Eval y ejecución dinámica peligrosa
        /eval\s*\(/gi,
        /new\s+Function\s*\(/gi,
        /document\.write\s*\(/gi,

        // Dominios sospechosos externos
        /https?:\/\/[^'"]*(?:pastebin|hastebin|ngrok|telegram)\.(?:com|io|me)/gi
    ];

    const results = {
        clean: [],
        suspicious: [],
        errors: []
    };

    // Obtener todos los scripts de la página
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    console.log(`📁 Scripts encontrados: ${scripts.length}`);

    for (const script of scripts) {
        const src = script.src;
        try {
            console.log(`⏳ Escaneando: ${src.split('/').pop()}`);
            const response = await fetch(src);
            const code = await response.text();

            let foundIssues = [];

            for (const pattern of DANGER_PATTERNS) {
                const matches = code.match(pattern);
                if (matches) {
                    foundIssues.push({
                        pattern: pattern.source,
                        matches: matches.slice(0, 3), // Máximo 3 ejemplos
                        count: matches.length
                    });
                }
            }

            if (foundIssues.length > 0) {
                results.suspicious.push({ script: src, issues: foundIssues });
            } else {
                results.clean.push(src);
            }

        } catch (error) {
            results.errors.push({ script: src, error: error.message });
        }
    }

    // Mostrar resultados
    console.log('\n' + '━'.repeat(50));
    console.log('%c📊 RESULTADOS DEL ESCANEO', 'font-size: 16px; font-weight: bold;');

    if (results.suspicious.length === 0) {
        console.log('%c✅ CÓDIGO LIMPIO - No se detectaron patrones sospechosos',
            'font-size: 14px; color: #00FF00; font-weight: bold;');
    } else {
        console.log('%c⚠️ CÓDIGO SOSPECHOSO DETECTADO',
            'font-size: 14px; color: #FF0000; font-weight: bold;');

        for (const item of results.suspicious) {
            console.group(`🚨 ${item.script.split('/').pop()}`);
            for (const issue of item.issues) {
                console.warn(`Patrón: ${issue.pattern}`);
                console.warn(`Encontrados: ${issue.count} coincidencias`);
                console.log('Ejemplos:', issue.matches);
            }
            console.groupEnd();
        }
    }

    // Resumen
    console.log('\n📋 RESUMEN:');
    console.log(`   ✅ Scripts limpios: ${results.clean.length}`);
    console.log(`   ⚠️ Scripts sospechosos: ${results.suspicious.length}`);
    console.log(`   ❌ Errores de lectura: ${results.errors.length}`);

    if (results.errors.length > 0) {
        console.log('\n⚠️ Scripts que no se pudieron leer (CORS u otro error):');
        results.errors.forEach(e => console.log(`   - ${e.script}: ${e.error}`));
    }

    console.log('\n' + '━'.repeat(50));
    console.log('🔬 Escaneo completado: ' + new Date().toISOString());

    return results;
})();
