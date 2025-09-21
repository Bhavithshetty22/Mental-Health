import React, { useState, useEffect } from 'react';
import { Activity, Heart, Moon, Footprints, TrendingUp } from 'lucide-react';
import './GoogleFitWidget.css';

const GoogleFitnessWidget = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [fitnessData, setFitnessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gisReady, setGisReady] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Google Fit API configuration
  const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '847083852436-c8gkmj53clud9jgo41htnjce8tnbh060.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.sleep.read';

  // Session management constants
  const SESSION_STORAGE_KEY = 'googleFitSession';
  const DEFAULT_SESSION_DURATION = 50 * 60 * 1000; // 50 minutes (conservative estimate)
  const REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry (reduced from 10)

  // Load saved session on component mount
  useEffect(() => {
    const loadSavedSession = () => {
      try {
        const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          const now = Date.now();
          
          console.log('Checking saved session:', {
            expiry: new Date(sessionData.expiry),
            now: new Date(now),
            timeLeft: Math.floor((sessionData.expiry - now) / (1000 * 60))
          });
          
          // Check if session is still valid (use actual expiry, not buffer)
          if (sessionData.expiry && now < sessionData.expiry) {
            console.log('Loading saved Google Fit session');
            setAccessToken(sessionData.token);
            setTokenExpiry(sessionData.expiry);
            setIsConnected(true);
            
            // Auto-fetch data if session is valid
            setTimeout(() => {
              fetchFitnessData(sessionData.token);
            }, 500);
          } else {
            console.log('Saved session expired, clearing');
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        } else {
          console.log('No saved session found');
        }
      } catch (error) {
        console.error('Error loading saved session:', error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      
      // Mark initial load as complete
      setInitialLoadComplete(true);
    };

    loadSavedSession();
  }, []);

  // Save session to localStorage
  const saveSession = (token, expiryTime) => {
    try {
      const sessionData = {
        token: token,
        expiry: expiryTime,
        connectedAt: Date.now()
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      console.log('Session saved to localStorage:', sessionData);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  // Clear session
  const clearSession = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setAccessToken(null);
      setTokenExpiry(null);
      setIsConnected(false);
      setFitnessData(null);
      // Only show error if we had a session before
      if (accessToken) {
        setError('Session expired. Please reconnect to Google Fit.');
      }
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  // Check if a specific token is expired (can work without React state)
  const isSpecificTokenExpired = (token, expiry) => {
    if (!token || !expiry) return true;
    const now = Date.now();
    return now >= expiry;
  };

  // Check if current token is actually expired (relies on React state)
  const isTokenExpired = () => {
    if (!tokenExpiry || !accessToken) {
      console.log('Token check: No token or expiry available in state');
      return true;
    }
    
    const now = Date.now();
    const actuallyExpired = now >= tokenExpiry;
    
    if (actuallyExpired) {
      console.log('Token actually expired:', {
        expiry: new Date(tokenExpiry),
        now: new Date(now),
        timeLeft: Math.floor((tokenExpiry - now) / (1000 * 60))
      });
    }
    
    return actuallyExpired;
  };

  // Helper function to check if token needs refresh (different from expired)
  const needsRefresh = () => {
    if (!tokenExpiry || !accessToken) return false;
    const now = Date.now();
    return now >= (tokenExpiry - REFRESH_BUFFER);
  };

  // Initialize Google Identity Services (new API)
  useEffect(() => {
    const initializeGIS = () => {
      try {
        // Load Google Identity Services script
        if (!window.google?.accounts) {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => {
            console.log('Google Identity Services loaded');
            setGisReady(true);
          };
          script.onerror = (error) => {
            console.error('Failed to load Google Identity Services:', error);
            setError('Failed to load Google authentication. Please check your internet connection.');
          };
          document.head.appendChild(script);
        } else {
          setGisReady(true);
        }
      } catch (error) {
        console.error('Error initializing GIS:', error);
        setError('Failed to initialize Google authentication.');
      }
    };

    initializeGIS();
  }, []);

  // Initialize token client when GIS is ready
  useEffect(() => {
    if (gisReady && window.google?.accounts?.oauth2) {
      try {
        // Initialize the token client
        window.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            if (response.error) {
              console.error('Token client error:', response);
              setError('Authentication failed. Please try again.');
              setLoading(false);
              return;
            }
            
            console.log('Access token received');
            
            // Calculate expiry time - use Google's actual expires_in value when available
            const expiresInMs = response.expires_in ? (response.expires_in * 1000) : DEFAULT_SESSION_DURATION;
            const expiryTime = Date.now() + expiresInMs; // Use full duration, don't artificially limit it
            
            console.log(`Token expires in ${Math.floor(expiresInMs / (1000 * 60))} minutes, expiry time:`, new Date(expiryTime));
            
            // Set state first, then save to localStorage
            setAccessToken(response.access_token);
            setTokenExpiry(expiryTime);
            setIsConnected(true);
            setLoading(false);
            
            // Save to localStorage
            saveSession(response.access_token, expiryTime);
            
            // Fetch data with the token directly (don't rely on state)
            fetchFitnessData(response.access_token);
          },
          error_callback: (error) => {
            console.error('Token client error callback:', error);
            setError('Authentication failed. Please try again.');
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error initializing token client:', error);
        setError('Failed to initialize authentication client.');
      }
    }
  }, [gisReady, GOOGLE_CLIENT_ID, SCOPES]);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!isConnected || !tokenExpiry) return;

    const timeUntilExpiry = tokenExpiry - Date.now();
    const refreshTime = timeUntilExpiry - REFRESH_BUFFER;

    if (refreshTime > 0 && refreshTime < (30 * 60 * 1000)) { // Only set timer if less than 30 mins away
      console.log(`Setting refresh timer for ${Math.floor(refreshTime / (1000 * 60))} minutes`);
      const refreshTimer = setTimeout(() => {
        console.log('Auto-refreshing Google Fit token');
        if (window.tokenClient && isConnected && !isTokenExpired()) {
          // Try silent refresh first
          try {
            window.tokenClient.requestAccessToken({ prompt: '' });
          } catch (error) {
            console.log('Silent refresh failed, will require manual reconnection');
            if (accessToken) {
              setError('Session will expire soon. Please reconnect to Google Fit.');
            }
          }
        }
      }, refreshTime);

      return () => clearTimeout(refreshTimer);
    }
  }, [isConnected, tokenExpiry]);

  // Fetch data using the new REST API with access token
  const fetchFitnessData = async (token = accessToken) => {
    console.log('fetchFitnessData called with token:', token ? 'present' : 'missing');
    
    if (!token) {
      setError('No access token available');
      setLoading(false);
      return;
    }

    // If using stored token, check if it's expired using state
    // If using passed token (like during initial auth), skip expiry check
    const usingStoredToken = (token === accessToken);
    if (usingStoredToken && isTokenExpired()) {
      console.log('Stored token expired, clearing session');
      if (accessToken) {
        setError('Session expired. Please reconnect to Google Fit.');
      }
      clearSession();
      setLoading(false);
      return;
    }

    console.log('Proceeding with data fetch, token valid');

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTime = startOfDay.getTime() * 1000000; // Convert to nanoseconds
    const endTime = now.getTime() * 1000000; // Convert to nanoseconds

    try {
      const fitnessData = {};

      // Helper function to fetch data from Google Fit REST API
      const fetchDataFromAPI = async (dataSourceId) => {
        try {
          const url = `https://www.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(dataSourceId)}/datasets/${startTime}-${endTime}`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            if (response.status === 401) {
              // Token expired or invalid
              console.log('Token invalid, clearing session');
              clearSession();
              throw new Error('Session expired. Please reconnect to Google Fit.');
            }
            if (response.status === 403) {
              throw new Error('Access denied. Please ensure you have granted fitness permissions.');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          return data;
        } catch (error) {
          console.log(`Error fetching data from ${dataSourceId}:`, error.message);
          if (error.message.includes('Session expired')) {
            throw error; // Re-throw session expired errors
          }
          return { point: [] };
        }
      };

      // Fetch steps data
      const stepsData = await fetchDataFromAPI('derived:com.google.step_count.delta:com.google.android.gms:estimated_steps');
      if (stepsData.point && stepsData.point.length > 0) {
        fitnessData.steps = stepsData.point.reduce((total, point) => {
          return total + (point.value[0].intVal || 0);
        }, 0);
      } else {
        fitnessData.steps = 0;
      }

      // Fetch calories data
      const caloriesData = await fetchDataFromAPI('derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended');
      if (caloriesData.point && caloriesData.point.length > 0) {
        fitnessData.calories = Math.round(caloriesData.point.reduce((total, point) => {
          return total + (point.value[0].fpVal || 0);
        }, 0));
      } else {
        fitnessData.calories = 0;
      }

      // Fetch active minutes
      const activeMinsData = await fetchDataFromAPI('derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes');
      if (activeMinsData.point && activeMinsData.point.length > 0) {
        fitnessData.activeMinutes = activeMinsData.point.reduce((total, point) => {
          return total + (point.value[0].intVal || 0);
        }, 0);
      } else {
        fitnessData.activeMinutes = 0;
      }

      // Fetch heart rate data
      const heartRateData = await fetchDataFromAPI('derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm');
      if (heartRateData.point && heartRateData.point.length > 0) {
        const heartRates = heartRateData.point.map(point => point.value[0].fpVal);
        fitnessData.heartRate = Math.round(heartRates.reduce((sum, rate) => sum + rate, 0) / heartRates.length);
      } else {
        fitnessData.heartRate = 0;
      }

      // Fetch sleep data (previous night)
      const yesterdayStart = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
      const sleepStartTime = yesterdayStart.getTime() * 1000000;
      const sleepEndTime = startTime;

      try {
        const sleepUrl = `https://www.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.sleep.segment:com.google.android.gms:merged/datasets/${sleepStartTime}-${sleepEndTime}`;
        
        const sleepResponse = await fetch(sleepUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (sleepResponse.ok) {
          const sleepData = await sleepResponse.json();
          if (sleepData.point && sleepData.point.length > 0) {
            const sleepDuration = sleepData.point.reduce((total, point) => {
              return total + (point.value[0].intVal || 0);
            }, 0);
            fitnessData.sleep = Math.round((sleepDuration / (1000 * 60 * 60)) * 10) / 10; // Convert to hours
          } else {
            fitnessData.sleep = 0;
          }
        } else {
          fitnessData.sleep = 0;
        }
      } catch (error) {
        console.log('Sleep data not available:', error.message);
        fitnessData.sleep = 0;
      }

      setFitnessData(fitnessData);
      setLoading(false);
      setError(null);

    } catch (error) {
      console.error('Error fetching fitness data:', error);
      if (error.message.includes('Session expired')) {
        setError(error.message);
      } else {
        setError('Failed to fetch fitness data: ' + error.message);
      }
      setLoading(false);
    }
  };

  const connectGoogleFit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!gisReady || !window.tokenClient) {
        throw new Error('Google authentication not ready. Please wait and try again.');
      }

      // Request access token
      window.tokenClient.requestAccessToken({ prompt: 'consent' });
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setError('Failed to connect to Google Fit: ' + error.message);
      setLoading(false);
    }
  };

  const disconnectGoogleFit = async () => {
    try {
      if (accessToken) {
        // Revoke the access token
        await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
          headers: {
            'Content-type': 'application/x-www-form-urlencoded'
          }
        });
      }
      
      clearSession();
      setError(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      clearSession(); // Clear session anyway
      setError('Disconnected (with warning: ' + error.message + ')');
    }
  };

  const refreshFitnessData = async () => {
    if (!accessToken) {
      setError('Please reconnect to Google Fit');
      return;
    }
    
    if (isTokenExpired()) {
      setError('Session expired. Please reconnect to Google Fit.');
      clearSession();
      return;
    }
    
    setLoading(true);
    setError(null);
    await fetchFitnessData();
  };

  const getMoodCorrelation = () => {
    if (!fitnessData) return null;
    
    const { steps, sleep, activeMinutes } = fitnessData;
    let correlationText = '';
    let correlationColor = '';
    
    if (steps >= 8000 && sleep >= 7 && activeMinutes >= 30) {
      correlationText = 'Your activity suggests positive mood indicators!';
      correlationColor = 'correlation-positive';
    } else if (steps < 5000 || sleep < 6) {
      correlationText = 'Low activity may be affecting your mood';
      correlationColor = 'correlation-warning';
    } else {
      correlationText = 'Moderate activity levels detected';
      correlationColor = 'correlation-moderate';
    }
    
    return { text: correlationText, color: correlationColor };
  };

  // Get session info for display
  const getSessionInfo = () => {
    if (!tokenExpiry) return null;
    
    const timeLeft = tokenExpiry - Date.now();
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    
    if (minutesLeft <= 0) {
      return 'Session expired';
    } else if (minutesLeft < 15) {
      return `Expires in ${minutesLeft}min`;
    } else if (minutesLeft < 60) {
      return `${minutesLeft}min left`;
    } else {
      const hoursLeft = Math.floor(minutesLeft / 60);
      const remainingMins = minutesLeft % 60;
      return `${hoursLeft}h ${remainingMins}min left`;
    }
  };

  const correlation = getMoodCorrelation();
  const sessionInfo = getSessionInfo();

  return (
    <div className="fitness-widget">
      <div className="widget-header">
        <div className="header-content">
          <div className="icon-container">
            <Activity className="header-icon" size={20} />
          </div>
          <div className="header-text">
            <h3 className="widget-title">Google Fitness</h3>
            <p className="widget-subtitle">
              {isConnected ? (
                <>
                  Connected
                  {sessionInfo && (
                    <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '8px' }}>
                      • {sessionInfo}
                    </span>
                  )}
                </>
              ) : gisReady ? 'Ready to connect' : 'Loading...'}
            </p>
          </div>
        </div>
        <div className={`status-indicator ${isConnected ? 'connected' : gisReady ? 'ready' : 'loading'}`}></div>
      </div>

      {error && initialLoadComplete && (
        <div className="error-message">
          <p>{error}</p>
          {error.includes('Session expired') && (
            <button 
              onClick={connectGoogleFit}
              disabled={loading || !gisReady}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Reconnecting...' : 'Reconnect Now'}
            </button>
          )}
          {error.includes('permissions') && (
            <details style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
              <summary>Troubleshooting</summary>
              <ul style={{ marginTop: '4px', paddingLeft: '16px', fontSize: '11px' }}>
                <li>Make sure you grant all requested permissions</li>
                <li>Try disconnecting and reconnecting</li>
                <li>Check if Google Fit app has data for today</li>
                <li>Some data may take time to sync from your device</li>
              </ul>
            </details>
          )}
        </div>
      )}

      {!isConnected ? (
        <div className="connect-section">
          <p className="connect-description">
            Link your Google Fit data to see how physical activity affects your mental well-being
          </p>
          <button 
            onClick={connectGoogleFit}
            disabled={loading || !gisReady}
            className="connect-button"
          >
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <Activity size={16} />
                <span>{gisReady ? 'Connect Google Fit' : 'Loading...'}</span>
              </>
            )}
          </button>
          {gisReady && (
            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
              You'll be asked to sign in and grant access to your fitness data
            </p>
          )}
        </div>
      ) : (
        <div className="connected-content">
          {/* Fitness Metrics */}
          <div className="metrics-grid">
            <div className="metric-card steps">
              <Footprints className="metric-icon" size={20} />
              <div className="metric-value">
                {fitnessData?.steps?.toLocaleString() || '0'}
              </div>
              <div className="metric-label">Steps Today</div>
            </div>
            
            <div className="metric-card heart-rate">
              <Heart className="metric-icon" size={20} />
              <div className="metric-value">
                {fitnessData?.heartRate || '0'}
              </div>
              <div className="metric-label">Avg Heart Rate</div>
            </div>
            
            <div className="metric-card sleep">
              <Moon className="metric-icon" size={20} />
              <div className="metric-value">
                {fitnessData?.sleep || '0'}h
              </div>
              <div className="metric-label">Sleep Last Night</div>
            </div>
            
            <div className="metric-card active-minutes">
              <TrendingUp className="metric-icon" size={20} />
              <div className="metric-value">
                {fitnessData?.activeMinutes || '0'}
              </div>
              <div className="metric-label">Active Minutes</div>
            </div>
          </div>

          {/* Data freshness indicator */}
          <div style={{ fontSize: '11px', opacity: 0.6, textAlign: 'center', marginTop: '12px' }}>
            {fitnessData?.steps === 0 && fitnessData?.heartRate === 0 ? 
              'No data available - check your Google Fit app' : 
              `Data synced from Google Fit`}
          </div>

          <div className="action-buttons">
            <button 
              className="details-button"
              onClick={refreshFitnessData}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button 
              onClick={disconnectGoogleFit}
              className="disconnect-button"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleFitnessWidget;