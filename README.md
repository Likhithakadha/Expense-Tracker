# 💸 SpendWise - Expense Tracker (Project 11: Finance Management)

Full-stack personal finance app. React + Vite + Recharts frontend, Express.js + JWT backend, SQLite (sql.js) database.

## Run (easy)
Windows: double-click `start.bat` -> opens http://localhost:5000
Mac/Linux: `bash start.sh`
Click **"Try demo account"** on the login page to see everything with sample data.

## Run (development, 2 terminals)
    cd backend  && npm install && npm start      # API on :5000
    cd frontend && npm install && npm run dev    # UI on :5173 (proxies /api to :5000)

## Project requirement -> where it is built
| Requirement | Implementation |
|---|---|
| Analytics page (monthly income vs expenses, category pie, weekly bar, highest category, weekday pattern, smart insights) | `pages/Analytics.jsx` + `GET /api/analytics/overview` |
| Edit & delete (transactions, budgets, goals, categories) with confirm dialogs | `components.jsx` (`useTxEditor`, `Confirm`), `PUT/DELETE` routes |
| PDF / CSV / print report download | `pages/Reports.jsx` (jsPDF) |
| Dashboard with financial overview | `pages/Dashboard.jsx` + `GET /api/analytics/summary` |
| Transaction entry forms | `pages/Transactions.jsx` modal -> `POST /api/transactions` |
| Budget management interface | `pages/Budgets.jsx` -> `/api/budgets` |
| Interactive charts (Recharts) | Donut, 6-month bar, cumulative area chart on dashboard |
| Category management | `pages/Categories.jsx` -> `/api/categories` |
| Filtering & sorting | Search, type, category, date range, sort in Transactions |
| Expense report generation | `pages/Reports.jsx`, `GET /api/reports/monthly`, CSV export, print/PDF |
| Responsive design | CSS grid + mobile bottom-nav, dark/light theme |
| RESTful API | `backend/routes/api.js`, `routes/auth.js` |
| JWT authentication | `middleware/auth.js` (7-day tokens, bcrypt hashed passwords) |
| Express validation middleware | `validate()` in `middleware/auth.js` |
| Report generation services | `/api/reports/*` |
| Budget notification system | `budgetStatus()` - 🔔 bell, toasts at 80% / 100% |
| Data aggregation for analytics | SQL GROUP BY in `/api/analytics/summary` |
| Schema design | `backend/db.js` (users, categories, transactions, budgets, goals) |
| Multi-device sync | All data lives on the server; log in anywhere |

## Innovative extras
- ⚡ **Natural-language quick add** - type `coffee 150 yesterday`, `salary 52k`, `uber 320 2 days ago`; category, type, amount and date are detected.
- 🧠 **Financial Health Score (0-100)** - savings rate, budget discipline, tracking habit, goal progress.
- 🔮 **Month-end forecast** and smart insights (biggest category, vs last month, overspend warning).
- 🏆 **Savings goals** with progress.
- 🚀 One-click **demo account**, dark/light theme, printable reports.

## API cheat-sheet
`POST /api/auth/register|login|demo` · `GET/POST/PUT/DELETE /api/transactions` · `POST /api/transactions/quick` · `GET/POST/DELETE /api/budgets` · `GET /api/notifications` · `GET/POST /api/goals` · `GET/POST/PUT/DELETE /api/categories` · `GET /api/analytics/summary` · `GET /api/reports/monthly` · `GET /api/reports/export` (CSV)
