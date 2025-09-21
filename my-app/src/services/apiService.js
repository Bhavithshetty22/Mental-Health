// apiService.js - Client-only API service for Mood Tracker
// Works entirely in-memory (no backend, no localStorage)

class ApiService {
  constructor() {
    // In-memory storage for session data
    this.sessionStorage = {
      token: null,
      user: null,
      moods: []
    };
  }

  // Simulate delay for realistic API feel
  async simulateDelay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- Auth Token Helpers ---
  getAuthToken() {
    return this.sessionStorage.token;
  }

  setAuthToken(token) {
    this.sessionStorage.token = token;
  }

  removeAuthToken() {
    this.sessionStorage.token = null;
    this.sessionStorage.user = null;
  }

  // Generate a fake JWT token for demo purposes
  generateFakeToken(userId) {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      userId,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }));
    const signature = btoa("fake-signature");
    return `${header}.${payload}.${signature}`;
  }

  // --- Authentication ---
  async register(userData) {
    await this.simulateDelay(800);

    if (!userData.email || !userData.password) {
      throw new Error("Email and password are required");
    }

    if (userData.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const userId = `user_${Date.now()}`;
    const token = this.generateFakeToken(userId);

    const user = {
      id: userId,
      email: userData.email,
      name: userData.name || userData.email.split("@")[0],
      createdAt: new Date().toISOString()
    };

    this.setAuthToken(token);
    this.sessionStorage.user = user;

    return { success: true, token, user, message: "Registration successful" };
  }

  async login(credentials) {
    await this.simulateDelay(600);

    if (!credentials.email || !credentials.password) {
      throw new Error("Email and password are required");
    }

    const userId = `user_${credentials.email.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const token = this.generateFakeToken(userId);

    const user = {
      id: userId,
      email: credentials.email,
      name: credentials.email.split("@")[0],
      lastLogin: new Date().toISOString()
    };

    this.setAuthToken(token);
    this.sessionStorage.user = user;

    return { success: true, token, user, message: "Login successful" };
  }

  async logout() {
    await this.simulateDelay(200);
    this.removeAuthToken();
    this.sessionStorage.moods = []; // clear all moods on logout
    return { success: true, message: "Logged out successfully" };
  }

  async getCurrentUser() {
    await this.simulateDelay(300);
    if (!this.isAuthenticated()) throw new Error("Not authenticated");

    return { success: true, user: this.sessionStorage.user };
  }

  async updateProfile(userData) {
    await this.simulateDelay(500);
    if (!this.isAuthenticated()) throw new Error("Not authenticated");

    this.sessionStorage.user = {
      ...this.sessionStorage.user,
      ...userData,
      updatedAt: new Date().toISOString()
    };

    return {
      success: true,
      user: this.sessionStorage.user,
      message: "Profile updated successfully"
    };
  }

  // --- Moods ---
  async getMoods(startDate, endDate) {
    await this.simulateDelay(400);
    if (!this.isAuthenticated()) throw new Error("Not authenticated");

    let moods = [...this.sessionStorage.moods];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      moods = moods.filter(mood => {
        const moodDate = new Date(mood.date);
        return moodDate >= start && moodDate <= end;
      });
    }

    return {
      success: true,
      moods: moods.sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  }

  async saveMood(moodData) {
    await this.simulateDelay(600);
    if (!this.isAuthenticated()) throw new Error("Not authenticated");

    const newMood = {
      id: `mood_${Date.now()}`,
      userId: this.sessionStorage.user.id,
      date: moodData.date || new Date().toISOString().split("T")[0],
      mood: moodData.mood,
      intensity: moodData.intensity,
      notes: moodData.notes || "",
      tags: moodData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Replace mood if same date already exists
    this.sessionStorage.moods = this.sessionStorage.moods.filter(
      mood => mood.date !== newMood.date
    );

    this.sessionStorage.moods.push(newMood);

    return { success: true, mood: newMood, message: "Mood saved successfully" };
  }

  async deleteMood(date) {
    await this.simulateDelay(300);
    if (!this.isAuthenticated()) throw new Error("Not authenticated");

    const initialLength = this.sessionStorage.moods.length;
    this.sessionStorage.moods = this.sessionStorage.moods.filter(
      mood => mood.date !== date
    );

    if (this.sessionStorage.moods.length === initialLength) {
      throw new Error("Mood not found");
    }

    return { success: true, message: "Mood deleted successfully" };
  }

  async getMoodStats(period = 30) {
    await this.simulateDelay(500);
    if (!this.isAuthenticated()) throw new Error("Not authenticated");

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const moods = this.sessionStorage.moods.filter(mood => {
      const moodDate = new Date(mood.date);
      return moodDate >= startDate && moodDate <= endDate;
    });

    const totalMoods = moods.length;
    const moodCounts = {};
    let totalIntensity = 0;

    moods.forEach(mood => {
      moodCounts[mood.mood] = (moodCounts[mood.mood] || 0) + 1;
      totalIntensity += mood.intensity || 0;
    });

    const averageIntensity = totalMoods > 0 ? totalIntensity / totalMoods : 0;
    const mostCommonMood = Object.keys(moodCounts).reduce(
      (a, b) => (moodCounts[a] > moodCounts[b] ? a : b),
      null
    );

    return {
      success: true,
      stats: {
        period,
        totalMoods,
        averageIntensity: Math.round(averageIntensity * 10) / 10,
        mostCommonMood,
        moodBreakdown: moodCounts,
        moodsPerWeek: Math.round((totalMoods / period) * 7 * 10) / 10
      }
    };
  }

  // --- Utility ---
  isAuthenticated() {
    const token = this.getAuthToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  async checkHealth() {
    await this.simulateDelay(100);
    return {
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: "client-only"
    };
  }

  // --- Demo Helper ---
  async seedDemoData() {
    if (!this.isAuthenticated()) return;

    const demoMoods = [
      { date: "2025-09-12", mood: "happy", intensity: 4, notes: "Had a great day at work!" },
      { date: "2025-09-11", mood: "neutral", intensity: 3, notes: "Average day, nothing special" },
      { date: "2025-09-10", mood: "sad", intensity: 2, notes: "Feeling a bit down today" },
      { date: "2025-09-09", mood: "happy", intensity: 5, notes: "Spent time with friends" },
      { date: "2025-09-08", mood: "anxious", intensity: 3, notes: "Worried about upcoming presentation" }
    ];

    for (const mood of demoMoods) {
      await this.saveMood(mood);
    }

    return { success: true, message: "Demo data added successfully" };
  }
}

// Singleton instance
const apiService = new ApiService();
export default apiService;

// Export individual methods for direct imports
export const {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  getMoods,
  saveMood,
  deleteMood,
  getMoodStats,
  isAuthenticated,
  checkHealth,
  seedDemoData
} = apiService;
