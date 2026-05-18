import { format, subDays, isSameDay } from "date-fns";
import { mockUser, mockHabits, mockLogs, mockAI } from "../utils/mockData.js";
import { GoogleGenAI } from "@google/genai";

// ─── Frontend Persistent Storage ───────────────────────────────────────────
const client = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
const DB_KEYS = { USER: "ht_user", HABITS: "ht_habits", LOGS: "ht_logs" };

const getDB = () => ({
  user: JSON.parse(localStorage.getItem(DB_KEYS.USER)) || { ...mockUser },
  habits: JSON.parse(localStorage.getItem(DB_KEYS.HABITS)) || [...mockHabits],
  logs: JSON.parse(localStorage.getItem(DB_KEYS.LOGS)) || [...mockLogs],
});

const saveDB = (s) => {
  localStorage.setItem(DB_KEYS.USER, JSON.stringify(s.user));
  localStorage.setItem(DB_KEYS.HABITS, JSON.stringify(s.habits));
  localStorage.setItem(DB_KEYS.LOGS, JSON.stringify(s.logs));
};

const todayKey = () => format(new Date(), "yyyy-MM-dd");

// ─── AI Engine ─────────────────────────────────────────────────────────────
const getAIContext = (s) => {
  const cats = {};
  const habits = s.habits.filter(h => !h.isArchived).map(h => {
    const count = s.logs.filter(l => l.habitId === h._id).length;
    cats[h.category] = (cats[h.category] || 0) + count;
    return `- ${h.name} (${h.category}): ${count} total completions.`;
  }).join("\n");
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
  return `### USER: ${s.user.name}\n### HABITS:\n${habits}\n### BEST CATEGORY: ${top ? top[0] : "N/A"}\n### INSTRUCTIONS: Use this data. Be specific. No generic advice.`;
};

const callGemini = async (prompt, sys) => {
  try {
    const res = await client.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: [{ role: "user", parts: [{ text: `${sys}\n\nUser: ${prompt}` }] }],
    });
    return res.text?.() || res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || "Error parsing AI response.";
  } catch (e) { 
    console.error("Gemini Error:", e);
    return `AI Error: ${e.message || "Unknown error"}`; 
  }
};

// ─── API Router ───────────────────────────────────────────────────────────
const route = async (method, url, data, params) => {
  const s = getDB();
  let res = null;

  // Auth & Profile
  if (url === "/auth/me") res = { user: s.user };
  if (url === "/auth/login") {
    const user = { ...s.user };
    if (data.email && data.email !== "mehrab@example.com") {
      const prefix = data.email.split("@")[0];
      user.name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      user.email = data.email;
    }
    res = { user, token: "ht-token" };
  }
  if (url === "/auth/register") {
    s.user = { ...s.user, ...data };
    res = { user: s.user, token: "ht-token" };
  }
  if (url === "/auth/profile") {
    Object.assign(s.user, data);
    res = { user: s.user };
  }

  // Habits
  if (url === "/habits") {
    if (method === "GET") res = s.habits.filter(h => params?.includeArchived === "true" || !h.isArchived).sort((a, b) => a.order - b.order);
    if (method === "POST") { const h = { ...data, _id: `h_${Date.now()}`, createdAt: new Date().toISOString() }; s.habits.push(h); res = h; }
  }
  if (url.startsWith("/habits/")) {
    const id = url.split("/")[2], i = s.habits.findIndex(h => h._id === id);
    if (i !== -1) {
      if (url.endsWith("/archive")) s.habits[i].isArchived = !s.habits[i].isArchived;
      else if (method === "PUT") Object.assign(s.habits[i], data);
      else if (method === "DELETE") { s.habits.splice(i, 1); s.logs = s.logs.filter(l => l.habitId !== id); }
      res = s.habits[i] || { message: "Deleted" };
    }
  }

  // Logs & Stats
  if (url === "/logs") {
    const d = data?.date || todayKey();
    if (method === "POST") { const l = { _id: `l_${data.habitId}_${d}`, habitId: data.habitId, completedDate: d }; if (!s.logs.some(x => x.habitId === l.habitId && x.completedDate === d)) s.logs.push(l); res = l; }
    if (method === "DELETE") { s.logs = s.logs.filter(l => !(l.habitId === data.habitId && l.completedDate === d)); res = { message: "Removed" }; }
  }
  if (url === "/logs/today") res = s.logs.filter(l => l.completedDate === todayKey());
  if (url === "/logs/range") res = s.logs.filter(l => l.completedDate >= params.start && l.completedDate <= params.end);
  if (url === "/logs/heatmap") res = Array.from({ length: 90 }).map((_, i) => { const k = format(subDays(new Date(), i), "yyyy-MM-dd"); return { date: k, count: s.logs.filter(l => l.completedDate === k).length }; }).reverse();
  if (url === "/logs/stats") {
    const d30 = Array.from({ length: 30 }).map((_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));
    res = { perHabit: s.habits.filter(h => !h.isArchived).map(h => {
      const logs = s.logs.filter(l => l.habitId === h._id && d30.includes(l.completedDate)).map(l => l.completedDate).sort();
      let cur = 0, lon = 0, run = 0, p = null;
      logs.forEach(k => { run = (p && Math.round((new Date(k)-new Date(p))/86400000) === 1) ? run + 1 : 1; if (run > lon) lon = run; p = k; });
      const set = new Set(logs); let c = new Date(); if (set.has(todayKey()) || set.has(format(subDays(new Date(), 1), "yyyy-MM-dd"))) { if (!set.has(todayKey())) c = subDays(c, 1); while(set.has(format(c, "yyyy-MM-dd"))) { cur++; c = subDays(c, 1); } }
      return { habitId: h._id, name: h.name, icon: h.icon, color: h.color, category: h.category, completions30d: logs.length, currentStreak: cur, longestStreak: lon };
    }), days: d30.reverse() };
  }

  // AI
  if (url.startsWith("/ai/")) {
    const ctx = getAIContext(s);
    const prompts = {
      "/ai/weekly-report": "Generate report. Be encouraging.",
      "/ai/suggest-habits": "Suggest 3 habits. Return JSON: [{name, description, frequency, category, icon, reason}].",
      "/ai/recovery-plan": "Streak broken. 3-day recovery plan.",
      "/ai/chat": `Helpful habit assistant.`,
      "/ai/morning": "2-line morning nudge."
    };
    const content = await callGemini(data?.question || prompts[url], ctx);
    if (url === "/ai/suggest-habits") try { res = { suggestions: JSON.parse(content.replace(/```json|```/g, "")) }; } catch { res = { suggestions: mockAI.suggestions }; }
    else res = { content };
  }

  saveDB(s);
  return res;
};

const api = {
  get: async (u, o = {}) => ({ data: await route("GET", u, null, o.params) }),
  post: async (u, d) => ({ data: await route("POST", u, d) }),
  put: async (u, d) => ({ data: await route("PUT", u, d) }),
  delete: async (u, o = {}) => ({ data: await route("DELETE", u, o?.data) }),
};

export default api;
