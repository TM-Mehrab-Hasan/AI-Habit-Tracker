# ✨ AI Habit Tracker

A high-fidelity, intelligent habit tracking application built with **React 19**, **Tailwind CSS 4**, and **Google Gemini AI**. This application is designed to be fully frontend-driven, using local storage for persistence and the Gemini API for personalized habit coaching and analysis.

![AI Habit Tracker Preview](public/icons.svg) <!-- Replace with a real screenshot if available -->

## 🚀 Key Features

- **🤖 AI-Powered Coaching:** Chat with your habit data using the latest Gemini models. Get personalized insights into your consistency and performance.
- **📊 Interactive Analytics:** Visualize your progress with interactive charts (Bar, Pie, and Heatmaps) powered by **Recharts**.
- **🧠 Intelligent Insights:**
  - **Weekly Performance Reports:** Automated analysis of your week.
  - **Tailored Habit Suggestions:** AI-driven recommendations based on your goals.
  - **Streak Recovery Plans:** Actionable steps to get back on track after a break.
- **🔋 Pure Frontend Architecture:** No backend required. Your data is stored securely in your browser's **localStorage**.
- **🌗 Beautiful UI:** Modern, responsive design with full **Dark Mode** support and smooth animations.
- **✋ Drag & Drop:** Reorder your habits with ease using **@dnd-kit**.

## 🛠️ Tech Stack

- **Framework:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **AI Integration:** [@google/genai](https://www.npmjs.com/package/@google/genai) (Gemini 2.0 Flash)
- **Charts:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Date Management:** [date-fns](https://date-fns.org/)
- **Bundler:** [Vite](https://vitejs.dev/)

## 🏁 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/ai-habit-tracker.git
cd ai-habit-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up your Gemini API Key
Create a `.env` file in the root directory and add your key:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```
> **Note:** Get your free API key from [Google AI Studio](https://aistudio.google.com/).

### 4. Run the application
```bash
npm run dev
```

## 🏗️ Architecture

The app uses a **Mock API Interceptor** pattern. Requests are made via Axios to `/api/*`, but instead of hitting a server, they are intercepted by a custom frontend engine that:
1.  **Persists data** to `localStorage`.
2.  **Calculates statistics** (streaks, completion rates) on the fly.
3.  **Interfaces with Gemini** to provide real-time intelligence.

This ensures the app is lightning-fast, privacy-conscious, and requires zero server maintenance.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
