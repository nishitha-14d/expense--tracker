
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const readData = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const money = value =>
  "₹" + Number(value || 0).toLocaleString("en-IN");

export default function App() {
  const [users, setUsers] = useState(() => readData("ef_users", []));
  const [expenses, setExpenses] = useState(() => readData("ef_expenses", []));
  const [user, setUser] = useState(() => readData("ef_session", null));

  const [authMode, setAuthMode] = useState("login");
  const [page, setPage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [authError, setAuthError] = useState("");

  const [form, setForm] = useState({
    title: "",
    type: "expense",
    category: "Food",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    payment: "UPI"
  });

  const [auth, setAuth] = useState({
    name: "",
    username: "",
    email: "",
    password: ""
  });

  useEffect(() => {
    localStorage.setItem("ef_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("ef_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("ef_session", JSON.stringify(user));
    } else {
      localStorage.removeItem("ef_session");
    }
  }, [user]);

  const isAdmin = user?.role === "admin";

  const myExpenses = useMemo(() => {
    const list = isAdmin
      ? expenses
      : expenses.filter(item => item.owner === user?.username);

    return list
      .filter(item =>
        `${item.title} ${item.category} ${item.owner} ${item.payment} ${item.type || "expense"}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, user, isAdmin, search]);

  // Income and expense calculations
  const totalIncome = myExpenses
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpense = myExpenses
    .filter(item => item.type !== "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const balance = totalIncome - totalExpense;

  const monthIncome = myExpenses
    .filter(item => {
      const d = new Date(item.date);
      const now = new Date();
      return item.type === "income" &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const monthExpense = myExpenses
    .filter(item => {
      const d = new Date(item.date);
      const now = new Date();
      return item.type !== "income" &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const notify = message => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  };

  // Login
  const handleLogin = event => {
    event.preventDefault();
    setAuthError("");

    if (
      auth.username.trim().toLowerCase() === "admin" &&
      auth.password === "admin123"
    ) {
      setUser({
        name: "Administrator",
        username: "admin",
        role: "admin"
      });
      setPage("Dashboard");
      return;
    }

    const found = users.find(item =>
      item.username.toLowerCase() === auth.username.trim().toLowerCase() &&
      item.password === auth.password
    );

    if (!found) {
      setAuthError("Invalid username or password.");
      return;
    }

    setUser(found);
    setPage("Dashboard");
  };

  // Register
  const handleRegister = event => {
    event.preventDefault();
    setAuthError("");

    const username = auth.username.trim();
    const email = auth.email.trim();

    if (!auth.name.trim() || !username || !email || !auth.password) {
      setAuthError("Please fill in all fields.");
      return;
    }

    if (username.toLowerCase() === "admin") {
      setAuthError("This username is reserved.");
      return;
    }

    if (users.some(item =>
      item.username.toLowerCase() === username.toLowerCase()
    )) {
      setAuthError("Username already exists.");
      return;
    }

    if (users.some(item =>
      item.email.toLowerCase() === email.toLowerCase()
    )) {
      setAuthError("Email already registered.");
      return;
    }

    const newUser = {
      name: auth.name.trim(),
      username,
      email,
      password: auth.password,
      role: "user"
    };

    setUsers(previous => [...previous, newUser]);
    setUser(newUser);
    setPage("Dashboard");
  };

  // Logout
  const logout = () => {
    setUser(null);
    setAuth({
      name: "",
      username: "",
      email: "",
      password: ""
    });
    setAuthMode("login");
    setPage("Dashboard");
    setSearch("");
  };

  // Open add transaction form
  const openAdd = () => {
    setEditing(null);
    setForm({
      title: "",
      type: "expense",
      category: "Food",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      payment: "UPI"
    });
    setShowForm(true);
  };

  // Open edit transaction form
  const openEdit = item => {
    setEditing(item);
    setForm({
      title: item.title,
      type: item.type || "expense",
      category: item.category,
      amount: item.amount,
      date: item.date,
      payment: item.payment
    });
    setShowForm(true);
  };

  // Save transaction
  const saveExpense = event => {
    event.preventDefault();

    if (!form.title.trim() || Number(form.amount) <= 0) {
      notify("Enter a valid title and amount.");
      return;
    }

    if (editing) {
      setExpenses(previous => previous.map(item =>
        item.id === editing.id
          ? { ...item, ...form, amount: Number(form.amount) }
          : item
      ));
      notify("Transaction updated successfully.");
    } else {
      const newExpense = {
        ...form,
        id: Date.now().toString(),
        amount: Number(form.amount),
        owner: user.username
      };

      setExpenses(previous => [newExpense, ...previous]);
      notify(
        `${form.type === "income" ? "Income" : "Expense"} added successfully.`
      );
    }

    setShowForm(false);
    setEditing(null);
  };

  // Delete transaction
  const deleteExpense = id => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    setExpenses(previous => previous.filter(item => item.id !== id));
    notify("Transaction deleted successfully.");
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ["Title", "Type", "Category", "Amount", "Date", "Payment", "Owner"],
      ...myExpenses.map(item => [
        item.title,
        item.type || "expense",
        item.category,
        item.amount,
        item.date,
        item.payment,
        item.owner
      ])
    ];

    const csv = rows.map(row =>
      row.map(value =>
        `"${String(value ?? "").replace(/"/g, '""')}"`
      ).join(",")
    ).join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "expensetracker-report.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  // Login and registration screen
  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-decoration">
          <div className="brand-mark">💰</div>
          <h1>Expense Tracker</h1>
          <p>Take control of your money. Make every rupee count.</p>

          <div className="auth-feature">
            <span>✦</span> Smart expense tracking
          </div>
          <div className="auth-feature">
            <span>✦</span> Income and expense management
          </div>
          <div className="auth-feature">
            <span>✦</span> Your spending, organized
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-mobile-brand">Expense Tracker</div>

          <p className="eyebrow">WELCOME TO EXPENSE TRACKER</p>

          <h2>
            {authMode === "login" ? "Welcome back" : "Create account"}
          </h2>

          <p className="muted">
            {authMode === "login"
              ? "Sign in to continue to your dashboard."
              : "Create your account to manage your finances."}
          </p>

          <form onSubmit={authMode === "login" ? handleLogin : handleRegister}>
            {authMode === "register" && (
              <>
                <label>Full name</label>
                <input
                  placeholder="Enter your name"
                  value={auth.name}
                  onChange={e =>
                    setAuth({ ...auth, name: e.target.value })
                  }
                  required
                />

                <label>Email address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={auth.email}
                  onChange={e =>
                    setAuth({ ...auth, email: e.target.value })
                  }
                  required
                />
              </>
            )}

            <label>Username</label>
            <input
              placeholder="Enter username"
              value={auth.username}
              onChange={e =>
                setAuth({ ...auth, username: e.target.value })
              }
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={auth.password}
              onChange={e =>
                setAuth({ ...auth, password: e.target.value })
              }
              required
            />

            {authError && (
              <p className="error-text">{authError}</p>
            )}

            <button className="primary-btn full-btn" type="submit">
              {authMode === "login" ? "Sign in →" : "Create account →"}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button onClick={() => {
              setAuthError("");
              setAuthMode(authMode === "login" ? "register" : "login");
            }}>
              {authMode === "login" ? " Create account" : " Sign in"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Navigation
  const navItems = isAdmin
    ? ["Dashboard", "Transactions", "Users", "Reports", "Profile"]
    : ["Dashboard", "My Expenses", "Reports", "Profile"];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="side-brand">
          <div className="brand-mark small-mark">💰</div>
          <span>Expense Tracker</span>
        </div>

        <p className="nav-caption">WORKSPACE</p>

        <nav>
          {navItems.map((item, index) => (
            <button
              key={item}
              className={`nav-link ${page === item ? "active" : ""}`}
              onClick={() => setPage(item)}
            >
              <span className="nav-symbol">
                {["▦", "⇄", "♙", "▥", "⚙"][index]}
              </span>

              {item}

              {page === item && (
                <span className="nav-active-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="side-user">
            <div className="avatar">
              {(user.name || user.username).charAt(0).toUpperCase()}
            </div>

            <div className="side-user-info">
              <strong>{user.name || user.username}</strong>
              <span>{isAdmin ? "Administrator" : "User account"}</span>
            </div>
          </div>

          <button className="logout-btn" onClick={logout}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> {page}
          </div>

          <div className="topbar-right">
            <span className="role-pill">
              {isAdmin ? "ADMIN" : "USER"}
            </span>

            <div className="avatar top-avatar">
              {(user.name || user.username).charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="content-area">
          {/* Page heading */}
          <div className="welcome-row">
            <div>
              <p className="eyebrow">OVERVIEW</p>

              <h1>
                {page === "Dashboard"
                  ? `Good day, ${user.name || user.username} 👋`
                  : page}
              </h1>

              <p className="muted">
                {isAdmin
                  ? "Monitor your platform and manage all transactions."
                  : "Here is your personal financial overview."}
              </p>
            </div>

            {(page === "Dashboard" ||
              page === "My Expenses" ||
              page === "Transactions") && (
              <button className="primary-btn" onClick={openAdd}>
                + Add transaction
              </button>
            )}
          </div>

          {/* Dashboard */}
          {page === "Dashboard" && (
            <>
              <div className="stats-grid">
                <Stat
                  title="Total Income"
                  value={money(totalIncome)}
                  icon="↗"
                  note={`This month: ${money(monthIncome)}`}
                  positive
                />

                <Stat
                  title="Total Expenses"
                  value={money(totalExpense)}
                  icon="↘"
                  note={`This month: ${money(monthExpense)}`}
                  negative
                />

                <Stat
                  title="Available Balance"
                  value={money(balance)}
                  icon="₹"
                  note="Income minus expenses"
                />

                <Stat
                  title="Transactions"
                  value={myExpenses.length}
                  icon="⇄"
                  note={
                    isAdmin
                      ? `${users.length} registered users`
                      : "Your transactions"
                  }
                />
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {isAdmin
                        ? "Recent platform transactions"
                        : "Recent transactions"}
                    </h2>
                    <p className="muted">
                      Your latest recorded transactions
                    </p>
                  </div>

                  <button
                    className="text-btn"
                    onClick={() =>
                      setPage(isAdmin ? "Transactions" : "My Expenses")
                    }
                  >
                    View all →
                  </button>
                </div>

                <ExpenseTable
                  items={myExpenses.slice(0, 6)}
                  isAdmin={isAdmin}
                  onEdit={openEdit}
                  onDelete={deleteExpense}
                />
              </div>
            </>
          )}

          {/* User expenses and Admin transactions */}
          {(page === "My Expenses" || page === "Transactions") && (
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{page}</h2>
                  <p className="muted">
                    Manage and review your transactions
                  </p>
                </div>

                <input
                  className="search-input"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <ExpenseTable
                items={myExpenses}
                isAdmin={isAdmin}
                onEdit={openEdit}
                onDelete={deleteExpense}
              />
            </div>
          )}

          {/* Admin users */}
          {page === "Users" && isAdmin && (
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Registered users</h2>
                  <p className="muted">
                    Accounts registered in Expense Tracker
                  </p>
                </div>

                <span className="count-pill">
                  {users.length} users
                </span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((item, index) => (
                      <tr key={item.username + index}>
                        <td>{item.name}</td>
                        <td>@{item.username}</td>
                        <td>{item.email}</td>
                        <td>
                          <span className="category-pill">User</span>
                        </td>
                      </tr>
                    ))}

                    {users.length === 0 && (
                      <tr>
                        <td colSpan="4" className="empty-cell">
                          No users registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reports */}
          {page === "Reports" && (
            <>
              <div className="stats-grid">
                <Stat
                  title="Total Income"
                  value={money(totalIncome)}
                  icon="↗"
                  note="All recorded income"
                  positive
                />

                <Stat
                  title="Total Expenses"
                  value={money(totalExpense)}
                  icon="↘"
                  note="All recorded expenses"
                  negative
                />

                <Stat
                  title="Available Balance"
                  value={money(balance)}
                  icon="₹"
                  note="Income minus expenses"
                />

                <Stat
                  title="Total Records"
                  value={myExpenses.length}
                  icon="▤"
                  note="All transactions"
                />
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Category breakdown</h2>
                    <p className="muted">
                      Spending grouped by category
                    </p>
                  </div>

                  <button className="secondary-btn" onClick={exportCSV}>
                    ↓ Export CSV
                  </button>
                </div>

                <div className="category-list">
                  {Object.entries(
                    myExpenses
                      .filter(item => item.type !== "income")
                      .reduce((acc, item) => {
                        acc[item.category] =
                          (acc[item.category] || 0) +
                          Number(item.amount);
                        return acc;
                      }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => (
                      <div className="category-row" key={category}>
                        <div className="category-name">
                          <span>{category}</span>
                          <strong>{money(amount)}</strong>
                        </div>

                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${
                                totalExpense
                                  ? (amount / totalExpense) * 100
                                  : 0
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    ))}

                  {totalExpense === 0 && (
                    <p className="empty-cell">
                      Add expenses to view your report.
                    </p>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Income and expense summary</h2>
                    <p className="muted">
                      Overall financial summary
                    </p>
                  </div>
                </div>

                <div className="profile-details">
                  <div>
                    <span>Total income</span>
                    <strong style={{ color: "#35c98b" }}>
                      {money(totalIncome)}
                    </strong>
                  </div>

                  <div>
                    <span>Total expenses</span>
                    <strong style={{ color: "#ff7777" }}>
                      {money(totalExpense)}
                    </strong>
                  </div>

                  <div>
                    <span>Available balance</span>
                    <strong>{money(balance)}</strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Profile */}
          {page === "Profile" && (
            <div className="panel profile-panel">
              <div className="profile-avatar">
                {(user.name || user.username).charAt(0).toUpperCase()}
              </div>

              <h2>{user.name || user.username}</h2>
              <p className="muted">
                {user.email || "Administrator account"}
              </p>

              <div className="profile-details">
                <div>
                  <span>Username</span>
                  <strong>{user.username}</strong>
                </div>

                <div>
                  <span>Account role</span>
                  <strong>{user.role}</strong>
                </div>

                <div>
                  <span>Total transactions</span>
                  <strong>{myExpenses.length}</strong>
                </div>

                <div>
                  <span>Available balance</span>
                  <strong>{money(balance)}</strong>
                </div>
              </div>

              <button className="secondary-btn" onClick={logout}>
                Sign out
              </button>
            </div>
          )}
        </section>

        <footer className="app-footer">
          Expense Tracker <span>·</span> Personal finance, made practical
        </footer>
      </main>

      {/* Add / Edit transaction modal */}
      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setEditing(null);
            }
          }}
        >
          <form className="expense-modal" onSubmit={saveExpense}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">TRANSACTION MANAGER</p>
                <h2>
                  {editing ? "Update transaction" : "Add new transaction"}
                </h2>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                ×
              </button>
            </div>

            <label>Transaction title</label>
            <input
              placeholder="e.g. Salary or Grocery shopping"
              value={form.title}
              onChange={e =>
                setForm({ ...form, title: e.target.value })
              }
              required
            />

            <label>Transaction type</label>
            <select
              value={form.type}
              onChange={e =>
                setForm({ ...form, type: e.target.value })
              }
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            <div className="form-grid">
              <div>
                <label>Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={form.amount}
                  onChange={e =>
                    setForm({ ...form, amount: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={e =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {(
                    form.type === "income"
                      ? [
                          "Salary",
                          "Business",
                          "Freelance",
                          "Investment",
                          "Gift",
                          "Other"
                        ]
                      : [
                          "Food",
                          "Travel",
                          "Shopping",
                          "Bills",
                          "Education",
                          "Health",
                          "Entertainment",
                          "Other"
                        ]
                  ).map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e =>
                    setForm({ ...form, date: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label>Payment method</label>
                <select
                  value={form.payment}
                  onChange={e =>
                    setForm({ ...form, payment: e.target.value })
                  }
                >
                  {["UPI", "Cash", "Card", "Net Banking"].map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancel
              </button>

              <button className="primary-btn" type="submit">
                {editing
                  ? "Save changes"
                  : `Add ${form.type}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notification */}
      {notice && (
        <div className="toast">
          ✓ {notice}
        </div>
      )}
    </div>
  );
}

// Dashboard statistic card
function Stat({ title, value, icon, note, positive, negative }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>

      <h2
        style={{
          color: positive
            ? "#35c98b"
            : negative
              ? "#ff7777"
              : undefined
        }}
      >
        {value}
      </h2>

      <p>{note}</p>
    </div>
  );
}

// Transaction table
function ExpenseTable({ items, isAdmin, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            {isAdmin && <th>Owner</th>}
            <th>Category</th>
            <th>Date</th>
            <th>Payment</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map(item => {
            const type = item.type || "expense";

            return (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                </td>

                <td>
                  <span
                    style={{
                      color: type === "income" ? "#35c98b" : "#ff7777",
                      background:
                        type === "income"
                          ? "rgba(53,201,139,0.12)"
                          : "rgba(255,119,119,0.12)",
                      padding: "6px 10px",
                      borderRadius: "20px",
                      fontWeight: "600"
                    }}
                  >
                    {type === "income" ? "Income +" : "Expense −"}
                  </span>
                </td>

                {isAdmin && <td>{item.owner}</td>}

                <td>
                  <span className="category-pill">
                    {item.category}
                  </span>
                </td>

                <td>{item.date}</td>
                <td>{item.payment}</td>

                <td>
                  <strong
                    style={{
                      color: type === "income" ? "#35c98b" : "#ff7777"
                    }}
                  >
                    {type === "income" ? "+" : "−"}
                    {money(item.amount)}
                  </strong>
                </td>

                <td>
                  <div className="table-actions">
                    <button
                      title="Edit"
                      onClick={() => onEdit(item)}
                    >
                      ✎
                    </button>

                    <button
                      title="Delete"
                      onClick={() => onDelete(item.id)}
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {items.length === 0 && (
            <tr>
              <td
                colSpan={isAdmin ? 8 : 7}
                className="empty-cell"
              >
                No transactions found. Add your first transaction.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
