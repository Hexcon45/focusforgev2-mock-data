
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, UserStats, AppSettings, AmbientSoundType } from './types';
import { getStats, saveStats, getSettings, saveSettings, getDateKey } from './utils/storage';
import { playNotification, startAmbientSound, stopAmbientSound, updateAmbientVolume } from './utils/audio';

// --- Components ---

const StatsDashboard: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const formatMinutes = (m: number) => {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Determine today's date key once for comparison
  const today = new Date();
  const todayStr = getDateKey(today);

  // Prepare chart data for the last 7 days (including today as the final entry)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = getDateKey(d);
    
    // Look up count: either from today's live state or from historical archive
    const count = dateStr === todayStr 
      ? stats.todaySessions 
      : (stats.history[dateStr] || 0);
      
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count,
      isToday: dateStr === todayStr
    };
  });

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-300">Insights & Performance</span>
        </div>
        <svg 
          className={`text-slate-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}
          xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {!isCollapsed && (
        <div className="px-8 pb-8 pt-2 space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Focus Time (Today)</span>
              <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-white">{formatMinutes(stats.totalMinutesToday)}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Focus Time (Week)</span>
              <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-white">{formatMinutes(stats.totalMinutesWeek)}</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activity History (7 Days)</span>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Current Streak: {stats.currentStreak} days</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longest: {stats.longestStreak} days</span>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {chartData.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-full aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all relative ${
                    d.isToday 
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                      : d.count > 0 
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' 
                        : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600'
                  }`}>
                    <span className="text-lg">{d.count}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${d.isToday ? 'text-rose-500' : 'text-slate-400'}`}>
                    {d.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsModal: React.FC<{
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
}> = ({ isOpen, settings, onClose, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-8 zoom-in-95 duration-500"
        role="dialog"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="space-y-6 mb-10 overflow-y-auto max-h-[60vh] px-1">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Focus Duration</label>
              <span className="text-rose-500 font-bold">{localSettings.focusDuration} min</span>
            </div>
            <input 
              type="range" min="1" max="90" 
              value={localSettings.focusDuration} 
              onChange={(e) => setLocalSettings({...localSettings, focusDuration: parseInt(e.target.value)})}
              className="w-full accent-rose-500 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Break Duration</label>
              <span className="text-teal-500 font-bold">{localSettings.breakDuration} min</span>
            </div>
            <input 
              type="range" min="1" max="30" 
              value={localSettings.breakDuration} 
              onChange={(e) => setLocalSettings({...localSettings, breakDuration: parseInt(e.target.value)})}
              className="w-full accent-teal-500 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">Ambient Sound</label>
            <div className="grid grid-cols-3 gap-2">
              {(['rain', 'cafe', 'white'] as AmbientSoundType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setLocalSettings({ ...localSettings, ambientSoundType: type })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all ${
                    localSettings.ambientSoundType === type 
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Volume</span>
                <span className="text-xs font-bold text-slate-500">{Math.round(localSettings.ambientVolume * 100)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01"
                value={localSettings.ambientVolume} 
                onChange={(e) => setLocalSettings({...localSettings, ambientVolume: parseFloat(e.target.value)})}
                className="w-full accent-slate-400 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            onSave(localSettings);
            onClose();
          }}
          className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/30 transition-all active:scale-[0.98]"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
};

const Header: React.FC<{
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  onOpenSettings: () => void;
  isHidden?: boolean;
}> = ({ settings, setSettings, onOpenSettings, isHidden }) => {
  if (isHidden) return null;

  return (
    <header className="w-full max-w-2xl flex justify-between items-center py-6 px-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
        <span className="bg-rose-500 w-3 h-3 rounded-full"></span>
        FocusForge
      </h1>
      <div className="flex gap-3">
        <button
          onClick={() => {
            const newActive = !settings.ambientSound;
            setSettings({ ...settings, ambientSound: newActive });
            if (newActive) startAmbientSound(settings.ambientSoundType, settings.ambientVolume);
            else stopAmbientSound();
          }}
          title="Toggle Ambient Sound"
          className={`p-2 rounded-full transition-all hover:scale-110 ${
            settings.ambientSound ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}
        >
          {settings.ambientSound ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19x"/><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14l-4 4-4-4"/></svg>
          )}
        </button>
        <button
          onClick={() => setSettings({ ...settings, darkMode: !settings.darkMode })}
          title="Toggle Dark Mode"
          className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 transition-all hover:scale-110"
        >
          {settings.darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          )}
        </button>
        <button
          onClick={onOpenSettings}
          title="Timer Settings"
          className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 transition-all hover:scale-110"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    </header>
  );
};

const Timer: React.FC<{
  mode: TimerMode;
  timeLeft: number;
  isActive: boolean;
  isFocusMode: boolean;
  settings: AppSettings;
  onToggle: () => void;
  onReset: () => void;
  onSwitchMode: (m: TimerMode) => void;
  onToggleFocusMode: () => void;
  onToggleFullscreen: () => void;
}> = ({ mode, timeLeft, isActive, isFocusMode, settings, onToggle, onReset, onSwitchMode, onToggleFocusMode, onToggleFullscreen }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTime = (mode === 'focus' ? settings.focusDuration : settings.breakDuration) * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`flex flex-col items-center gap-8 py-10 transition-all duration-700 ${isFocusMode ? 'scale-110' : ''}`}>
      {!isFocusMode ? (
        <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-full animate-in fade-in zoom-in-95 duration-500">
          <button
            onClick={() => onSwitchMode('focus')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
              mode === 'focus' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Focus
          </button>
          <button
            onClick={() => onSwitchMode('break')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
              mode === 'break' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Break
          </button>
        </div>
      ) : (
        <div className="h-9 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-700">
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            Stay locked in.
          </span>
        </div>
      )}

      <div className="relative flex items-center justify-center w-72 h-72">
        <svg className="w-full h-full transform rotate-[-90deg]">
          <circle
            cx="50%" cy="50%" r={radius}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="12" fill="none"
          />
          <circle
            cx="50%" cy="50%" r={radius}
            className={`progress-ring ${
              mode === 'focus' ? 'stroke-rose-500' : 'stroke-teal-500'
            }`}
            strokeWidth="12" fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center select-none">
          <span className="timer-digit text-7xl font-bold tracking-tight">
            {formatTime(timeLeft)}
          </span>
          {!isFocusMode && (
            <span className="text-sm font-medium uppercase tracking-widest text-slate-400 mt-2 animate-in fade-in duration-500">
              {mode}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {!isFocusMode && (
          <button
            onClick={onReset}
            className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 animate-in fade-in slide-in-from-left-4 duration-500"
            title="Reset Timer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
        )}
        
        <button
          onClick={onToggle}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 ${
            isActive 
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-slate-500/10' 
              : 'bg-rose-500 text-white shadow-rose-500/20'
          }`}
        >
          {isActive ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg className="ml-1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
        </button>

        <div className="flex gap-2">
          <button
            onClick={onToggleFocusMode}
            className={`p-4 rounded-full transition-all active:scale-95 ${
              isFocusMode 
                ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          
          {isFocusMode && (
             <button
              onClick={onToggleFullscreen}
              className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 animate-in fade-in slide-in-from-right-4 duration-500"
              title="Toggle Fullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 3 6 6"/><path d="M9 21 3 15"/><path d="M21 3v6h-6"/><path d="M3 21v-6h6"/><path d="m3 3 6 6"/><path d="m21 21-6-6"/><path d="M3 3v6H9"/><path d="M21 21v-6h-6"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [stats, setStats] = useState<UserStats>(getStats());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (settings.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.darkMode]);

  useEffect(() => {
    if (settings.ambientSound) startAmbientSound(settings.ambientSoundType, settings.ambientVolume);
    else stopAmbientSound();
  }, [settings.ambientSound, settings.ambientSoundType]);

  useEffect(() => {
    updateAmbientVolume(settings.ambientVolume);
  }, [settings.ambientVolume]);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft((mode === 'focus' ? settings.focusDuration : settings.breakDuration) * 60);
    }
  }, [settings.focusDuration, settings.breakDuration, mode]);

  const handleSwitchMode = useCallback((newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft((newMode === 'focus' ? settings.focusDuration : settings.breakDuration) * 60);
  }, [settings]);

  const completeSession = useCallback(() => {
    playNotification();
    if (mode === 'focus') {
      const minutesCompleted = settings.focusDuration;
      const newStats: UserStats = {
        ...stats,
        todaySessions: stats.todaySessions + 1,
        weekSessions: stats.weekSessions + 1,
        totalMinutesToday: stats.totalMinutesToday + minutesCompleted,
        totalMinutesWeek: stats.totalMinutesWeek + minutesCompleted,
        lastUpdate: new Date().toISOString()
      };
      setStats(newStats);
      saveStats(newStats);
      handleSwitchMode('break');
    } else {
      handleSwitchMode('focus');
    }
  }, [mode, stats, handleSwitchMode, settings]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, completeSession]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { if (!isFocusMode) { setIsActive(false); setTimeLeft((mode === 'focus' ? settings.focusDuration : settings.breakDuration) * 60); } };
  const toggleFocusMode = () => { setIsFocusMode(!isFocusMode); if (isFocusMode && document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); };

  return (
    <div className={`min-h-screen flex flex-col items-center px-6 transition-all duration-1000 ${isFocusMode ? 'justify-center overflow-hidden pb-0' : 'pb-20'}`}>
      <Header settings={settings} setSettings={setSettings} onOpenSettings={() => setIsSettingsOpen(true)} isHidden={isFocusMode} />
      
      <main className={`w-full flex flex-col items-center max-w-2xl transition-all duration-1000 ${isFocusMode ? 'gap-0 mt-0' : 'gap-12 mt-8'}`}>
        <Timer
          mode={mode}
          timeLeft={timeLeft}
          isActive={isActive}
          isFocusMode={isFocusMode}
          settings={settings}
          onToggle={toggleTimer}
          onReset={resetTimer}
          onSwitchMode={handleSwitchMode}
          onToggleFocusMode={toggleFocusMode}
          onToggleFullscreen={toggleFullscreen}
        />
        
        {!isFocusMode && (
          <div className="w-full flex flex-col gap-6">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Daily Objective</span>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                  <button onClick={() => setStats(s => { const ns = {...s, dailyGoal: Math.max(1, s.dailyGoal - 1)}; saveStats(ns); return ns; })} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg></button>
                  <span className="text-sm font-bold tabular-nums px-1">{stats.dailyGoal}</span>
                  <button onClick={() => setStats(s => { const ns = {...s, dailyGoal: s.dailyGoal + 1}; saveStats(ns); return ns; })} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>
                </div>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 transition-all duration-700" style={{ width: `${Math.min((stats.todaySessions / stats.dailyGoal) * 100, 100)}%` }} />
              </div>
            </div>

            <StatsDashboard stats={stats} />
          </div>
        )}
      </main>

      {!isFocusMode && (
        <footer className="mt-auto pt-16 text-slate-400 text-xs font-medium uppercase tracking-widest text-center opacity-50">
          FocusForge &copy; {new Date().getFullYear()}
        </footer>
      )}

      <SettingsModal isOpen={isSettingsOpen} settings={settings} onClose={() => setIsSettingsOpen(false)} onSave={setSettings} />
    </div>
  );
};

export default App;
