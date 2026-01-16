/**
 * YavlGold V9.4 - Geolocation Utility Module (IIFE Pattern)
 * Robust location detection: GPS → IP → Fallback
 * No external dependencies, globally accessible
 *
 * FIX: Cache now respects mode (GPS cache ≠ IP cache)
 * FIX: GPS uses high accuracy with longer timeout
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

    // Separate cache keys for GPS and IP
    const GPS_CACHE_KEY = 'yavlgold_gps_cache';
    const IP_CACHE_KEY = 'yavlgold_ip_cache';
    const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
    const PREF_KEY = 'yavlgold_location_pref'; // 'gps' or 'ip'

    // ============================================
    // CACHE UTILITIES (Separate GPS/IP caches)
    // ============================================

    function getCachedCoords(mode) {
        const cacheKey = mode === 'ip' ? IP_CACHE_KEY : GPS_CACHE_KEY;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();

            if (now - data.timestamp > CACHE_TTL_MS) {
                localStorage.removeItem(cacheKey);
                return null;
            }

            return data;
        } catch (e) {
            console.warn('[Geo] Cache read error:', e);
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
        } catch (e) {
            console.warn('[Geo] Cache write error:', e);
        }
    }

    function clearLocationCache() {
        try {
            localStorage.removeItem(GPS_CACHE_KEY);
            localStorage.removeItem(IP_CACHE_KEY);
        } catch (e) {
            // Ignore
        }
    }

    // ============================================
    // PREFERENCE UTILITIES
    // ============================================

    function getLocationPreference() {
        try {
            return localStorage.getItem(PREF_KEY) || 'gps';
        } catch (e) {
            return 'gps';
        }
    }

    function setLocationPreference(pref) {
        try {
            localStorage.setItem(PREF_KEY, pref);
            // Don't clear cache on pref change - each mode has its own cache
        } catch (e) {
            console.warn('[Geo] Pref save error:', e);
        }
    }

    // ============================================
    // GPS LOCATION (High Accuracy)
    // ============================================

    function getBrowserCoords() {
        return new Promise((resolve) => {
            if (!('geolocation' in navigator)) {
                console.warn('[Geo] Geolocation not supported');
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const accuracy = position.coords.accuracy;
                    const result = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        source: 'gps',
                        label: 'Ubicación actual' + (accuracy ? ' (±' + Math.round(accuracy) + 'm)' : ''),
                        accuracy: accuracy || null
                    };
                    console.log('[Geo] 📍 GPS obtained:', result.lat.toFixed(4), result.lon.toFixed(4), '±' + Math.round(accuracy) + 'm');
                    resolve(result);
                },
                (error) => {
                    console.warn('[Geo] GPS error:', error.code, error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,  // FIX: Use high accuracy
                    timeout: 15000,            // FIX: 15 second timeout
                    maximumAge: 60000          // FIX: 1 minute cache (was 5 min)
                }
            );
        });
    }

    // ============================================
    // IP-BASED LOCATION
    // ============================================

    async function getIpCoords(isGpsFallback) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
            const response = await fetch(IPAPI_URL, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();

            if (!data.latitude || !data.longitude) {
                throw new Error('No coordinates in IP response');
            }

            let labelParts = [];
            if (data.city) labelParts.push(data.city);
            if (data.region) labelParts.push(data.region);
            if (data.country_name) labelParts.push(data.country_name);

            const locationInfo = labelParts.length > 0
                ? labelParts.slice(0, 2).join(', ')
                : 'ubicación aproximada';

            // FIX: Explicit label when GPS failed and fell back to IP
            const labelPrefix = isGpsFallback
                ? 'GPS no disponible → IP: '
                : 'Ubicación por IP: ';

            const result = {
                lat: data.latitude,
                lon: data.longitude,
                source: 'ip',
                label: labelPrefix + locationInfo,
                city: data.city || null,
                region: data.region || null,
                country: data.country_name || null,
                isGpsFallback: !!isGpsFallback
            };

            console.log('[Geo] 🌐 IP location:', result.label);
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
    // FIX: Cache respects mode - GPS mode uses GPS cache, IP mode uses IP cache
    // ============================================

    async function getCoordsSmart(options) {
        options = options || {};
        const preferIp = options.preferIp || false;
        const forceRefresh = options.forceRefresh || false;
        const mode = preferIp ? 'ip' : 'gps';

        // Check mode-specific cache first (GPS cache for GPS mode, IP cache for IP mode)
        if (!forceRefresh) {
            const cached = getCachedCoords(mode);
            if (cached) {
                console.log('[Geo] Using cached ' + mode.toUpperCase() + ' location');
                return cached;
            }
        }

        let result = null;

        if (preferIp) {
            // VPN/IP mode: IP → GPS → Fallback
            console.log('[Geo] Mode: IP (VPN) first');
            result = await getIpCoords(false);
            if (!result) {
                console.log('[Geo] IP failed, trying GPS...');
                result = await getBrowserCoords();
            }
        } else {
            // GPS mode: GPS → IP → Fallback
            console.log('[Geo] Mode: GPS first (high accuracy)');
            result = await getBrowserCoords();
            if (!result) {
                console.log('[Geo] GPS failed/denied, falling back to IP...');
                result = await getIpCoords(true); // true = GPS fallback
            }
        }

        // Final fallback
        if (!result) {
            console.log('[Geo] All methods failed, using fallback');
            result = Object.assign({}, FALLBACK_COORDS);
        }

        // Cache the result for THIS mode only
        setCachedCoords(result, mode);

        return result;
    }

    // ============================================
    // EXPOSE API
    // ============================================
    global.YGGeolocation = {
        FALLBACK_COORDS: FALLBACK_COORDS,
        getCachedCoords: getCachedCoords,
        clearLocationCache: clearLocationCache,
        getLocationPreference: getLocationPreference,
        setLocationPreference: setLocationPreference,
        getBrowserCoords: getBrowserCoords,
        getIpCoords: getIpCoords,
        getCoordsSmart: getCoordsSmart
    };

})(typeof window !== 'undefined' ? window : this);
