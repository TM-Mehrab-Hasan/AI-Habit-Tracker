import { useMemo, useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Sparkles,
  RefreshCw,
  Trophy,
  Activity,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { format, startOfWeek, addDays, subDays } from "date-fns";
import api from "../api/axios.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import Markdown from "../components/Markdown.jsx";

const REPORT_CACHE_KEY = (weekKey) => `weekly-report-${weekKey}`;

const DeltaPill = ({ delta, deltaPct }) => {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color =
    delta > 0
      ? "text-emerald-500 bg-emerald-500/10"
      : delta < 0
      ? "text-rose-500 bg-rose-500/10"
      : "text-soft bg-muted";

  const label = `${delta > 0 ? "+" : ""}${delta} (${
    deltaPct > 0 ? "+" : ""
  }${deltaPct}%)`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      <Icon size={12} /> {label}
    </span>
  );
};

export default function Insights() {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportGeneratedAt, setReportGeneratedAt] = useState(null);

  const thisWeek = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(start, i);
      return { date: d, key: format(d, "yyyy-MM-dd"), label: format(d, "EEE") };
    });
  }, []);

  const lastWeek = useMemo(() => {
    const start = subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(start, i);
      return { date: d, key: format(d, "yyyy-MM-dd"), label: format(d, "EEE") };
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const start = lastWeek[0].key;
        const end = thisWeek[6].key;
        const [habitsRes, logsRes] = await Promise.all([
          api.get("/habits"),
          api.get("/logs/range", { params: { start, end } }),
        ]);
        setHabits(habitsRes.data);
        setLogs(logsRes.data);

        const cached = localStorage.getItem(REPORT_CACHE_KEY(thisWeek[0].key));
        if (cached) {
          try {
            const { content, generatedAt } = JSON.parse(cached);
            setReport(content);
            setReportGeneratedAt(new Date(generatedAt));
          } catch (e) {
            console.error("Failed to parse cached report", e);
          }
        } else {
          generateReport();
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res = await api.post("/ai/weekly-report");
      setReport(res.data.content);
      const now = new Date();
      setReportGeneratedAt(now);
      localStorage.setItem(
        REPORT_CACHE_KEY(thisWeek[0].key),
        JSON.stringify({ content: res.data.content, generatedAt: now })
      );
    } catch {
      setReport("Failed to generate the report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  };

  const thisWeekKeys = useMemo(
    () => new Set(thisWeek.map((d) => d.key)),
    [thisWeek]
  );
  const thisWeekLogs = useMemo(
    () => logs.filter((l) => thisWeekKeys.has(l.completedDate)),
    [logs, thisWeekKeys]
  );

  const lastWeekKeys = useMemo(
    () => new Set(lastWeek.map((d) => d.key)),
    [lastWeek]
  );
  const lastWeekLogs = useMemo(
    () => logs.filter((l) => lastWeekKeys.has(l.completedDate)),
    [logs, lastWeekKeys]
  );

  const totalDone = thisWeekLogs.length;
  const lastTotal = lastWeekLogs.length;
  const delta = totalDone - lastTotal;
  const deltaPct =
    lastTotal === 0 ? 100 : Math.round((delta / lastTotal) * 100);

  const barData = useMemo(() => {
    return thisWeek.map((day) => ({
      name: day.label,
      completions: thisWeekLogs.filter((l) => l.completedDate === day.key)
        .length,
    }));
  }, [thisWeek, thisWeekLogs]);

  const categoryData = useMemo(() => {
    const cats = {};
    thisWeekLogs.forEach((l) => {
      const h = habits.find((x) => x._id === l.habitId);
      const cat = h?.category || "Other";
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [thisWeekLogs, habits]);

  const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#10b981"];

  if (loading) return <LoadingSpinner full />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Weekly insights
          </h1>
          <p className="text-sm text-muted mt-0.5 inline-flex items-center gap-1.5">
            <Calendar size={14} /> {format(thisWeek[0].date, "MMM d")} -{" "}
            {format(thisWeek[6].date, "MMM d")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateReport}
            className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
            disabled={reportLoading}
          >
            <RefreshCw
              size={13}
              className={reportLoading ? "animate-spin" : ""}
            />
            {reportGeneratedAt ? "Regenerate" : "Generate Report"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-soft mb-3">
            <Activity size={16} />
            <span className="text-sm font-medium">Weekly Completion</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-semibold">{totalDone}</div>
            <DeltaPill delta={delta} deltaPct={deltaPct} />
          </div>
          <div className="text-xs text-muted mt-0.5">vs last week</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-soft mb-3">
            <Zap size={16} />
            <span className="text-sm font-medium">Best performing day</span>
          </div>
          <div className="mt-1">
            <div className="text-2xl font-semibold">
              {[...barData].sort((a, b) => b.completions - a.completions)[0]
                ?.name || "N/A"}
            </div>
          </div>
          <div className="text-xs text-muted mt-0.5">Most completions</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-soft mb-3">
            <Trophy size={16} />
            <span className="text-sm font-medium">Top Category</span>
          </div>
          <div className="mt-1">
            <div className="text-2xl font-semibold">
              {categoryData[0]?.name || "N/A"}
            </div>
          </div>
          <div className="text-xs text-muted mt-0.5">Focus this week</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Weekly Distribution</h3>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--surface-border)"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-soft)", fontSize: 12 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "var(--surface-hover)", radius: 8 }}
                  contentStyle={{
                    backgroundColor: "var(--surface-card)",
                    border: "1px solid var(--surface-border)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="completions"
                  fill="var(--teal-500)"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-6">Category Mix</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-card)",
                    border: "1px solid var(--surface-border)",
                    borderRadius: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {categoryData.slice(0, 3).map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-xs text-soft">{cat.name}</span>
                </div>
                <span className="text-xs font-medium">{cat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">AI Performance Analysis</h3>
            {reportGeneratedAt && (
              <p className="text-xs text-muted">
                Generated {format(reportGeneratedAt, "MMM d, h:mm a")}
              </p>
            )}
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          {reportLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-soft animate-pulse">
              <RefreshCw size={24} className="animate-spin" />
              <p className="text-sm">Analysing your week...</p>
            </div>
          ) : report ? (
            <Markdown>{report}</Markdown>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-divider">
              <p className="text-sm text-muted mb-4">
                No analysis generated for this week yet.
              </p>
              <button onClick={generateReport} className="btn-primary">
                Generate Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
