/**
 * YavlGold V9.4 - Geolocation Utility Module (IIFE Pattern)
 * Robust location detection: GPS → IP → Fallback
 * No external dependencies, globally accessible
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
    const CACHE_KEY = 'yavlgold_location_cache';
    const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
    const PREF_KEY = 'yavlgold_location_pref'; // 'gps' or 'ip'

    // ============================================
    // CACHE UTILITIES
    // ============================================

    function getCachedCoords() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();

            if (now - data.timestamp > CACHE_TTL_MS) {
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            return data;
        } catch (e) {
            console.warn('[Geo] Cache read error:', e);
            return null;
        }
    }

    function setCachedCoords(coords) {
        try {
            const data = {
                ...coords,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[Geo] Cache write error:', e);
        }
    }

    function clearLocationCache() {
        try {
            localStorage.removeItem(CACHE_KEY);
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
            clearLocationCache();
        } catch (e) {
            console.warn('[Geo] Pref save error:', e);
        }
    }

    // ============================================
    // GPS LOCATION
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
                    const result = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        source: 'gps',
                        label: 'Ubicación actual'
                    };
                    console.log('[Geo] 📍 GPS obtained:', result.lat.toFixed(4), result.lon.toFixed(4));
                    resolve(result);
                },
                (error) => {
                    console.warn('[Geo] GPS error:', error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 8000,
                    maximumAge: 300000
                }
            );
        });
    }

    // ============================================
    // IP-BASED LOCATION
    // ============================================

    async function getIpCoords() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(IPAPI_URL, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
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

            const result = {
                lat: data.latitude,
                lon: data.longitude,
                source: 'ip',
                label: `Ubicación por IP: ${locationInfo}`,
                city: data.city || null,
                region: data.region || null,
                country: data.country_name || null
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
    // ============================================

    async function getCoordsSmart(options) {
        options = options || {};
        const preferIp = options.preferIp || false;
        const forceRefresh = options.forceRefresh || false;

        // Check cache first
        if (!forceRefresh) {
            const cached = getCachedCoords();
            if (cached) {
                console.log('[Geo] Using cached location:', cached.source);
                return cached;
            }
        }

        let result = null;

        if (preferIp) {
            console.log('[Geo] Mode: IP (VPN) first');
            result = await getIpCoords();
            if (!result) {
                console.log('[Geo] IP failed, trying GPS...');
                result = await getBrowserCoords();
            }
        } else {
            console.log('[Geo] Mode: GPS first');
            result = await getBrowserCoords();
            if (!result) {
                console.log('[Geo] GPS failed, trying IP...');
                result = await getIpCoords();
            }
        }

        // Final fallback
        if (!result) {
            console.log('[Geo] All methods failed, using fallback');
            result = Object.assign({}, FALLBACK_COORDS);
        }

        // Cache the result
        setCachedCoords(result);

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
