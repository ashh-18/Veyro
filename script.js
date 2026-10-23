
"use strict";

const STORAGE_KEY = "spendAlertData";

// ---------- STORAGE ----------

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return { budgets: {}, expenses: [] };
        }

        const parsed = JSON.parse(saved);

        return {
            budgets:
                parsed.budgets &&
                typeof parsed.budgets === "object" &&
                !Array.isArray(parsed.budgets)
                    ? parsed.budgets
                    : {},
            expenses: Array.isArray(parsed.expenses)
                ? parsed.expenses
                : []
        };
    } catch (error) {
        console.error("Could not load SpendAlert data:", error);
        alert("SpendAlert could not read saved data. Your stored data has not been cleared.");
        return { budgets: {}, expenses: [] };
    }
}

let data = loadData();

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Could not save SpendAlert data:", error);
        alert("Could not save your changes. Check browser storage permissions.");
        return false;
    }
}

// ---------- DATE HELPERS ----------

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getTodayExpenses() {
    const today = getToday();

    return data.expenses.filter(expense => expense.date === today);
}

function getTodaySpent() {
    return getTodayExpenses().reduce(
        (total, expense) => total + Number(expense.amount || 0),
        0
    );
}

function getTodayBudget() {
    return Number(data.budgets[getToday()] || 0);
}

// ---------- SET DAILY BUDGET ----------

function setBudget() {
    const input = document.getElementById("budget-input");

    if (!input) {
        console.error('Missing HTML element: id="budget-input"');
        alert("Budget input not found. Please check index.html.");
        return;
    }

    const rawValue = input.value.trim();
    const budget = Number(rawValue);

    if (
        rawValue === "" ||
        !Number.isFinite(budget) ||
        budget <= 0
    ) {
        alert("Please enter a valid daily budget greater than ₹0.");
        input.focus();
        return;
    }

    if (budget < getTodaySpent()) {
        alert("Your budget cannot be lower than your spending already recorded today.");
        input.focus();
        return;
    }

    const today = getToday();
    const previousBudget = data.budgets[today];

    data.budgets[today] = Math.round(budget * 100) / 100;

    if (!saveData()) {
        // Restore the in-memory value if saving fails.
        if (previousBudget === undefined) {
            delete data.budgets[today];
        } else {
            data.budgets[today] = previousBudget;
        }
        return;
    }

    renderApp();
    input.value = "";

    alert("Your daily budget has been saved!");
}

// ---------- ADD EXPENSE ----------

function addExpense(event) {
    event.preventDefault();

    const amountInput = document.getElementById("expense-amount");
    const categoryInput = document.getElementById("expense-category");
    const noteInput = document.getElementById("expense-note");

    if (!amountInput || !categoryInput || !noteInput) {
        console.error("One or more expense form fields are missing from index.html.");
        alert("The expense form is incomplete. Please check index.html.");
        return;
    }

    const rawAmount = amountInput.value.trim();
    const amount = Number(rawAmount);
    const category = categoryInput.value;
    const note = noteInput.value.trim();

    if (rawAmount === "" || !Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid expense amount.");
        amountInput.focus();
        return;
    }

    if (getTodayBudget() <= 0) {
        alert("Please set your daily budget before adding expenses.");
        return;
    }

    const expense = {
        id: (typeof crypto !== "undefined" &&
             typeof crypto.randomUUID === "function")
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        amount: Math.round(amount * 100) / 100,
        category: category || "Other",
        note,
        date: getToday(),
        time: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

    data.expenses.push(expense);

    if (!saveData()) {
        data.expenses.pop();
        return;
    }

    event.target.reset();
    renderApp();

    const spent = getTodaySpent();
    const budget = getTodayBudget();

    if (spent >= budget) {
        alert("Budget limit reached! Be careful with further spending.");
    } else if (spent >= budget * 0.8) {
        alert("Heads up! You've used 80% or more of today's budget.");
    }
}

// ---------- DELETE EXPENSE ----------

function deleteExpense(id) {
    const index = data.expenses.findIndex(
        expense => String(expense.id) === String(id)
    );

    if (index === -1) {
        console.warn("Expense not found:", id);
        return;
    }

    const deletedExpense = data.expenses[index];

    data.expenses.splice(index, 1);

    if (!saveData()) {
        data.expenses.splice(index, 0, deletedExpense);
        return;
    }

    renderApp();
}

// ---------- RENDER DASHBOARD ----------

function renderApp() {
    const today = getToday();
    const budget = getTodayBudget();
    const spent = getTodaySpent();
    const remaining = budget - spent;

    const todayLabel = document.getElementById("today-label");
    const budgetDisplay = document.getElementById("budget-display");
    const spentDisplay = document.getElementById("spent-display");
    const remainingDisplay = document.getElementById("remaining-display");
    const progressLabel = document.getElementById("progress-label");
    const progressTrack = document.getElementById("budget-progress");
    const progressFill = document.getElementById("progress-fill");
    const message = document.getElementById("budget-message");

    if (todayLabel) {
        todayLabel.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    if (budgetDisplay) {
        budgetDisplay.textContent = `₹${budget.toFixed(2)}`;
    }

    if (spentDisplay) {
        spentDisplay.textContent = `₹${spent.toFixed(2)}`;
    }

    if (remainingDisplay) {
        remainingDisplay.textContent = `₹${remaining.toFixed(2)}`;
    }

    const percentage = budget > 0
        ? Math.min((spent / budget) * 100, 100)
        : 0;

    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }

    if (progressTrack) {
        progressTrack.setAttribute("aria-valuenow", percentage.toFixed(0));
    }

    if (progressLabel) {
        progressLabel.textContent = `${percentage.toFixed(0)}%`;
    }

    if (message) {
        message.classList.remove("warning", "danger");

        if (budget <= 0) {
            message.textContent = "Set your daily budget to get started.";
        } else if (spent >= budget) {
            message.textContent = "You've reached your daily budget.";
            message.classList.add("danger");
        } else if (spent >= budget * 0.8) {
            message.textContent = "Careful! You've used at least 80% of your budget.";
            message.classList.add("warning");
        } else {
            message.textContent = "You're within your daily budget. Keep it up!";
        }
    }

    renderHistory();
}

// ---------- RENDER EXPENSE HISTORY ----------

function renderHistory() {
    const history = document.getElementById("expense-history");

    if (!history) {
        console.error('Missing HTML element: id="expense-history"');
        return;
    }

    history.replaceChildren();

    const expenses = [...data.expenses].sort((a, b) => {
        const dateCompare = String(b.date).localeCompare(String(a.date));

        if (dateCompare !== 0) {
            return dateCompare;
        }

        return String(b.time || "").localeCompare(String(a.time || ""));
    });

    if (expenses.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No expenses recorded yet.";
        history.appendChild(emptyMessage);
        return;
    }

    let currentDate = "";

    expenses.forEach(expense => {
        if (expense.date !== currentDate) {
            currentDate = expense.date;

            const heading = document.createElement("h3");
            heading.className = "history-date";
            heading.textContent = formatDate(expense.date);
            history.appendChild(heading);
        }

        const item = document.createElement("div");
        item.className = "expense-item";

        const icon = document.createElement("div");
        icon.className = "expense-icon";

        const icons = {
            Food: "♨",
            Travel: "↗",
            Shopping: "◇",
            College: "▤",
            Other: "•"
        };

        icon.textContent = icons[expense.category] || "•";
        icon.setAttribute("aria-hidden", "true");

        const details = document.createElement("div");
        details.className = "expense-details";

        const category = document.createElement("strong");
        category.textContent = expense.category || "Other";

        const note = document.createElement("span");
        note.textContent = expense.note || expense.time || "";

        details.append(category, note);

        const amount = document.createElement("span");
        amount.className = "expense-amount";
        amount.textContent = `−₹${Number(expense.amount || 0).toFixed(2)}`;

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute(
            "aria-label",
            `Delete expense of ₹${Number(expense.amount || 0).toFixed(2)}`
        );

        deleteButton.addEventListener("click", () => {
            deleteExpense(expense.id);
        });

        item.append(icon, details, amount, deleteButton);
        history.appendChild(item);
    });
}

// ---------- CONNECT BUTTONS AND FORMS ----------

function initialiseSpendAlert() {
    const setBudgetButton = document.getElementById("set-budget");
    const expenseForm = document.getElementById("expense-form");

    if (!setBudgetButton) {
        console.error('Set Budget button not found. Check id="set-budget" in index.html.');
    } else {
        setBudgetButton.addEventListener("click", setBudget);
    }

    if (!expenseForm) {
        console.error('Expense form not found. Check id="expense-form" in index.html.');
    } else {
        expenseForm.addEventListener("submit", addExpense);
    }

    renderApp();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseSpendAlert);
} else {
    initialiseSpendAlert();
}

// Update the dashboard if the date changes while the page is open.
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        renderApp();
    }
});

window.addEventListener("focus", renderApp);
