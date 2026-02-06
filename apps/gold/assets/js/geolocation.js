/**
 * YavlGold V9.4 - Geolocation Utility Module (IIFE Pattern)
 * Robust location detection: Manual → GPS → IP → Fallback
 * No external dependencies, globally accessible
 *
 * Features:
 * - Manual location override (user-selected, highest priority)
 * - Separate GPS/IP caches
 * - Open-Meteo Geocoding API for location search
 * - High accuracy GPS with proper timeout
 */

(function (global) {
    'use strict';

    // ============================================
    // CONSTANTS
    // ============================================
    const FALLBACK_COORDS = {
        lat: 8.132,
        lon: -71.98,
        label: 'La Grita (fallback)',
        source: 'fallback'
    };

    const IPAPI_URL = 'https://ipapi.co/json/';
    const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

    // Storage keys
    const MANUAL_LOCATION_KEY = 'YG_MANUAL_LOCATION';
    const GPS_CACHE_KEY = 'yavlgold_gps_cache';
    const IP_CACHE_KEY = 'yavlgold_ip_cache';
    const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
    const PREF_KEY = 'yavlgold_location_pref'; // 'gps' or 'ip'
    function isDebugEnabled() {
        if (typeof global === 'undefined' || !global.location) return false;
        if (new URLSearchParams(global.location.search).get('debug') === '1') return true;
        try {
            return global.localStorage.getItem('YG_GEO_DEBUG') === '1';
        } catch (_e) {
            return false;
        }
    }

    const DEBUG_ENABLED = isDebugEnabled();

    const debugState = {
        enabled: DEBUG_ENABLED,
        preference: null,
        override: null,
        manual: null,
        cache: { gps: null, ip: null },
        lastDecision: null,
        updatedAt: null
    };

    function toFiniteCoord(value) {
        const num = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(num) ? num : null;
    }

    function setDebugState(partial) {
        if (!DEBUG_ENABLED) return;
        Object.assign(debugState, partial);
        debugState.updatedAt = Date.now();
    }

    function setDebugCache(mode, info) {
        if (!DEBUG_ENABLED) return;
        debugState.cache[mode] = info;
        debugState.updatedAt = Date.now();
    }

    function debugLog() {
        if (!DEBUG_ENABLED) return;
        // eslint-disable-next-line no-console
        console.log('[GeoDebug]', ...arguments);
    }

    // ============================================
    // MANUAL LOCATION (Highest Priority)
    // ============================================

    function getManualLocation() {
        try {
            const stored = localStorage.getItem(MANUAL_LOCATION_KEY);
            if (!stored) return null;
            const data = JSON.parse(stored);
            const lat = toFiniteCoord(data && data.lat);
            const lon = toFiniteCoord(data && data.lon);
            const label = typeof (data && data.label) === 'string' ? data.label.trim() : '';
            // Validate required fields (coord 0 is valid)
            if (lat !== null && lon !== null && label) {
                const normalized = { ...data, lat: lat, lon: lon, label: label };
                setDebugState({ manual: { ...normalized } });
                return normalized;
            }
            setDebugState({ manual: null });
            return null;
        } catch (e) {
            console.warn('[Geo] Manual location read error:', e);
            setDebugState({ manual: null });
            return null;
        }
    }

    function setManualLocation(location) {
        try {
            const lat = toFiniteCoord(location && location.lat);
            const lon = toFiniteCoord(location && location.lon);
            const label = typeof (location && location.label) === 'string' ? location.label.trim() : '';
            if (lat === null || lon === null || !label) {
                console.warn('[Geo] Manual location invalid payload');
                return null;
            }
            const data = {
                lat: lat,
                lon: lon,
                label: label,
                source: 'manual',
                timestamp: Date.now(),
                // Optional metadata
                country: location.country || null,
                admin1: location.admin1 || null
            };
            localStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(data));
            console.log('[Geo] 📌 Manual location set:', data.label);
            setDebugState({ manual: { ...data } });
            return data;
        } catch (e) {
            console.warn('[Geo] Manual location save error:', e);
            return null;
        }
    }

    function clearManualLocation() {
        try {
            localStorage.removeItem(MANUAL_LOCATION_KEY);
            console.log('[Geo] Manual location cleared');
            setDebugState({ manual: null });
        } catch (e) {
            // Ignore
        }
    }

    // ============================================
    // GEOCODING (Open-Meteo API)
    // ============================================

    async function searchLocations(query) {
        if (!query || query.length < 2) return [];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const url = GEOCODING_URL + '?name=' + encodeURIComponent(query) + '&count=7&language=es&format=json';
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                return [];
            }

            // Map to simplified format
            return data.results.map(function (r) {
                let labelParts = [r.name];
                if (r.admin1) labelParts.push(r.admin1);
                if (r.country) labelParts.push(r.country);

                return {
                    lat: r.latitude,
                    lon: r.longitude,
                    label: labelParts.join(', '),
                    name: r.name,
                    admin1: r.admin1 || null,
                    country: r.country || null,
                    countryCode: r.country_code || null
                };
            });

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.warn('[Geo] Geocoding timeout');
            } else {
                console.warn('[Geo] Geocoding error:', error.message);
            }
            return [];
        }
    }

    // ============================================
    // CACHE UTILITIES (Separate GPS/IP caches)
    // ============================================

    function getCachedCoords(mode) {
        const cacheKey = mode === 'ip' ? IP_CACHE_KEY : GPS_CACHE_KEY;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (!cached) {
                setDebugCache(mode, { hit: false, valid: false, ageMs: null, timestamp: null });
                return null;
            }

            const data = JSON.parse(cached);
            const now = Date.now();
            const ageMs = now - data.timestamp;

            if (ageMs > CACHE_TTL_MS) {
                localStorage.removeItem(cacheKey);
                setDebugCache(mode, { hit: false, valid: false, ageMs: ageMs, timestamp: data.timestamp });
                return null;
            }

            setDebugCache(mode, { hit: true, valid: true, ageMs: ageMs, timestamp: data.timestamp });
            return data;
        } catch (e) {
            console.warn('[Geo] Cache read error:', e);
            setDebugCache(mode, { hit: false, valid: false, ageMs: null, timestamp: null });
            return null;
        }
    }

    function setCachedCoords(coords, mode) {
        const cacheKey = mode === 'ip' ? IP_CACHE_KEY : GPS_CACHE_KEY;
        try {
            const data = {
                ...coords,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(data));
            setDebugCache(mode, { hit: true, valid: true, ageMs: 0, timestamp: data.timestamp });
        } catch (e) {
            console.warn('[Geo] Cache write error:', e);
        }
    }

    function clearLocationCache() {
        try {
            localStorage.removeItem(GPS_CACHE_KEY);
            localStorage.removeItem(IP_CACHE_KEY);
            setDebugCache('gps', { hit: false, valid: false, ageMs: null, timestamp: null });
            setDebugCache('ip', { hit: false, valid: false, ageMs: null, timestamp: null });
        } catch (e) {
            // Ignore
        }
    }

    // ============================================
    // PREFERENCE UTILITIES
    // ============================================

    function getLocationPreference() {
        try {
            const pref = localStorage.getItem(PREF_KEY) || 'gps';
            setDebugState({ preference: pref });
            return pref;
        } catch (e) {
            setDebugState({ preference: 'gps' });
            return 'gps';
        }
    }

    function setLocationPreference(pref) {
        try {
            localStorage.setItem(PREF_KEY, pref);
            setDebugState({ preference: pref });
        } catch (e) {
            console.warn('[Geo] Pref save error:', e);
        }
    }

    // ============================================
    // GPS LOCATION (High Accuracy)
    // ============================================

    function getBrowserCoords() {
        return new Promise(function (resolve) {
            if (!('geolocation' in navigator)) {
                console.warn('[Geo] Geolocation not supported');
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                function (position) {
                    const accuracy = position.coords.accuracy;
                    const result = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        source: 'gps',
                        label: 'Ubicación actual' + (accuracy ? ' (\u00B1' + Math.round(accuracy) + 'm)' : ''),
                        accuracy: accuracy || null
                    };
                    console.log('[Geo] GPS obtained:', result.lat.toFixed(4), result.lon.toFixed(4), '\u00B1' + Math.round(accuracy) + 'm');
                    resolve(result);
                },
                function (error) {
                    console.warn('[Geo] GPS error:', error.code, error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                }
            );
        });
    }

    // ============================================
    // IP-BASED LOCATION
    // ============================================

    async function getIpCoords(isGpsFallback) {
        const controller = new AbortController();
        const timeoutId = setTimeout(function () { controller.abort(); }, 6000);

        try {
            const response = await fetch(IPAPI_URL, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();
            const lat = toFiniteCoord(data.latitude);
            const lon = toFiniteCoord(data.longitude);

            if (lat === null || lon === null) {
                throw new Error('No coordinates in IP response');
            }

            let labelParts = [];
            if (data.city) labelParts.push(data.city);
            if (data.region) labelParts.push(data.region);
            if (data.country_name) labelParts.push(data.country_name);

            const locationInfo = labelParts.length > 0
                ? labelParts.slice(0, 2).join(', ')
                : 'ubicaci\u00F3n aproximada';

            const labelPrefix = isGpsFallback
                ? 'GPS no disponible \u2192 IP: '
                : 'Ubicaci\u00F3n por IP: ';

            const result = {
                lat: lat,
                lon: lon,
                source: 'ip',
                label: labelPrefix + locationInfo,
                city: data.city || null,
                region: data.region || null,
                country: data.country_name || null,
                isGpsFallback: !!isGpsFallback
            };

            console.log('[Geo] IP location:', result.label);
            return result;

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.warn('[Geo] IP lookup timeout');
            } else {
                console.warn('[Geo] IP lookup error:', error.message);
            }
            return null;
        }
    }

    // ============================================
    // SMART LOCATION (ORCHESTRATOR)
    // Priority: Manual → GPS/IP → Fallback
    // ============================================

    async function getCoordsSmart(options) {
        options = options || {};
        const ipOverride = options.preferIp === true || options.ipOnly === true;
        const forceRefresh = options.forceRefresh || false;
        const ignoreManual = options.ignoreManual || false;
        const mode = ipOverride ? 'ip' : 'gps';
        let usedCache = false;

        setDebugState({ override: ipOverride ? 'IP_FIRST_OVERRIDE' : 'GPS_FIRST_DEFAULT' });
        if (ipOverride) {
            debugLog('Explicit override enabled: preferIp/ipOnly=true (Manual still has highest priority).');
        }

        // 1. Check manual location FIRST (highest priority)
        if (!ignoreManual) {
            const manual = getManualLocation();
            if (manual) {
                console.log('[Geo] Using MANUAL location:', manual.label);
                setDebugState({
                    lastDecision: {
                        source: 'manual',
                        label: manual.label,
                        lat: manual.lat,
                        lon: manual.lon,
                        usedCache: false,
                        override: ipOverride ? 'IP_FIRST_OVERRIDE' : 'GPS_FIRST_DEFAULT',
                        timestamp: Date.now()
                    }
                });
                return manual;
            }
        }

        // 2. Check mode-specific cache
        if (!forceRefresh) {
            const cached = getCachedCoords(mode);
            if (cached) {
                console.log('[Geo] Using cached ' + mode.toUpperCase() + ' location');
                usedCache = true;
                setDebugState({
                    lastDecision: {
                        source: cached.source || mode,
                        label: cached.label || 'cached',
                        lat: cached.lat,
                        lon: cached.lon,
                        usedCache: true,
                        override: ipOverride ? 'IP_FIRST_OVERRIDE' : 'GPS_FIRST_DEFAULT',
                        timestamp: cached.timestamp || Date.now()
                    }
                });
                return cached;
            }
        }

        let result = null;

        if (ipOverride) {
            // Explicit override mode: IP → GPS → Fallback
            console.log('[Geo] Mode: IP-first override (explicit)');
            result = await getIpCoords(false);
            if (!result) {
                console.log('[Geo] IP override failed, trying GPS...');
                result = await getBrowserCoords();
            }
        } else {
            // GPS mode: GPS → IP → Fallback
            console.log('[Geo] Mode: GPS first (high accuracy)');
            result = await getBrowserCoords();
            if (!result) {
                console.log('[Geo] GPS failed/denied, falling back to IP...');
                result = await getIpCoords(true);
            }
        }

        // Final fallback
        if (!result) {
            console.log('[Geo] All methods failed, using fallback');
            result = Object.assign({}, FALLBACK_COORDS);
        }

        // Cache the result for THIS mode only
        setCachedCoords(result, mode);

        setDebugState({
            lastDecision: {
                source: result.source,
                label: result.label,
                lat: result.lat,
                lon: result.lon,
                usedCache: usedCache,
                override: ipOverride ? 'IP_FIRST_OVERRIDE' : 'GPS_FIRST_DEFAULT',
                timestamp: Date.now()
            }
        });

        return result;
    }

    function getDebugState() {
        if (!DEBUG_ENABLED) return { enabled: false };
        try {
            return JSON.parse(JSON.stringify(debugState));
        } catch (e) {
            return { enabled: true };
        }
    }

    // ============================================
    // EXPOSE API
    // ============================================
    global.YGGeolocation = {
        FALLBACK_COORDS: FALLBACK_COORDS,
        // Manual location
        getManualLocation: getManualLocation,
        setManualLocation: setManualLocation,
        clearManualLocation: clearManualLocation,
        // Geocoding
        searchLocations: searchLocations,
        // Cache
        getCachedCoords: getCachedCoords,
        clearLocationCache: clearLocationCache,
        // Preferences
        getLocationPreference: getLocationPreference,
        setLocationPreference: setLocationPreference,
        // Location methods
        getBrowserCoords: getBrowserCoords,
        getIpCoords: getIpCoords,
        getCoordsSmart: getCoordsSmart,
        // Debug (optional)
        getDebugState: getDebugState
    };

})(typeof window !== 'undefined' ? window : this);
