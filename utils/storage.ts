
import { UserStats, AppSettings } from '../types';

const STATS_KEY = 'focusforge_stats';
const SETTINGS_KEY = 'focusforge_settings';

/**
 * Returns a YYYY-MM-DD string in LOCAL time.
 * This is crucial for consistent tracking across timezones.
 */
export const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to generate a realistic-looking history for a returning user
const generateMockHistory = () => {
  const history: { [key: string]: number } = {};
  const today = new Date();
  // Varying session counts for the last 10 days to ensure bars look different
  const mockCounts = [5, 2, 6, 3, 4, 1, 7, 3, 2, 5];
  for (let i = 1; i <= 10; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = getDateKey(d);
    history[dateStr] = mockCounts[i - 1] || 2;
  }
  return history;
};

const mockHistory = generateMockHistory();
const sessionsToday = 3;
// Use only the last 6 entries from history for the week calculation
const sessionsPast6Days = Object.values(mockHistory).slice(0, 6).reduce((a, b) => a + b, 0);
const totalWeekSessions = sessionsToday + sessionsPast6Days;

const DEFAULT_STATS: UserStats = {
  todaySessions: sessionsToday,
  weekSessions: totalWeekSessions,
  dailyGoal: 4,
  lastUpdate: new Date().toISOString(),
  weekStartDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  totalMinutesToday: sessionsToday * 25,
  totalMinutesWeek: totalWeekSessions * 25,
  longestStreak: 12,
  currentStreak: 5,
  history: mockHistory,
};

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  ambientSound: false,
  ambientSoundType: 'rain',
  ambientVolume: 0.5,
  focusDuration: 25,
  breakDuration: 5,
};

export const getStats = (): UserStats => {
  const stored = localStorage.getItem(STATS_KEY);
  let stats: UserStats;

  if (!stored) {
    stats = { ...DEFAULT_STATS };
    saveStats(stats);
  } else {
    try {
      stats = JSON.parse(stored);
      // Migration: If user has stale data without history, inject mock data so bars are visible
      if (!stats.history || Object.keys(stats.history).length === 0) {
        stats.history = generateMockHistory();
        // Recalculate streaks/totals based on new mock data for consistency
        stats.currentStreak = 5;
        stats.longestStreak = Math.max(stats.longestStreak, 12);
        saveStats(stats);
      }
    } catch (e) {
      stats = { ...DEFAULT_STATS };
      saveStats(stats);
    }
  }
  
  const now = new Date();
  const todayStr = getDateKey(now);
  const lastUpdateDate = new Date(stats.lastUpdate);
  const lastUpdateStr = getDateKey(lastUpdateDate);

  // Daily Reset and Streak Logic
  if (todayStr !== lastUpdateStr) {
    // Save yesterday's count into history
    stats.history[lastUpdateStr] = stats.todaySessions;

    const diffTime = Math.abs(now.getTime() - lastUpdateDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      if (stats.todaySessions > 0) {
        stats.currentStreak += 1;
      }
    } else {
      stats.currentStreak = 0;
    }

    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }

    stats.todaySessions = 0;
    stats.totalMinutesToday = 0;
    stats.lastUpdate = now.toISOString();
    saveStats(stats);
  }

  // Weekly Reset
  const weekStart = new Date(stats.weekStartDate);
  const diffWeekDays = Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  if (diffWeekDays >= 7) {
    stats.weekSessions = 0;
    stats.totalMinutesWeek = 0;
    stats.weekStartDate = now.toISOString();
    saveStats(stats);
  }

  return stats;
};

export const saveStats = (stats: UserStats) => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
