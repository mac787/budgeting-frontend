import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:3001/api"; // Adjust if your backend is hosted differently

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [categories, setCategories] = useState([
    { name: "Groceries", budget: 500, spent: 150, expenses: [{ amount: 50, id: 1, date: new Date() }, { amount: 100, id: 2, date: new Date() }] },
    { name: "Rent", budget: 1000, spent: 1000, expenses: [{ amount: 1000, id: 3, date: new Date() }] },
    { name: "Entertainment", budget: 200, spent: 50, expenses: [{ amount: 50, id: 4, date: new Date() }] },
  ]);
  const [showExpenses, setShowExpenses] = useState({});
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false); // State to toggle Add Category form visibility

  // Calculate totals
  const totalBudget = categories.reduce((sum, cat) => sum + cat.budget, 0);
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
  const remainingBalance = totalBudget - totalSpent;

  // Track current date
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Reset budgets on the first day of each month
  const checkAndResetBudget = () => {
    // Check if it's the first day of the month
    const lastResetDate = localStorage.getItem("lastResetDate");

    if (!lastResetDate || new Date(lastResetDate).getMonth() !== currentMonth || new Date(lastResetDate).getFullYear() !== currentYear) {
      // It's a new month, reset budgets
      setCategories((prevCategories) =>
        prevCategories.map((cat) => ({
          ...cat,
          spent: 0, // Reset spent amount
        }))
      );

      // Store the current date as the last reset date
      localStorage.setItem("lastResetDate", currentDate);
    }
  };

  useEffect(() => {
    checkAndResetBudget();
  }, [currentDate]);

  useEffect(() => {
    axios.get(`${API_URL}/categories`)
      .then(res => setCategories(res.data))
      .catch(err => console.error("Error loading categories:", err));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
  
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { password: passwordInput });
      if (res.data.success) {
        setIsAuthenticated(true);
        localStorage.setItem("budgetAppLoggedIn", "true");
      }
    } catch (err) {
      alert("Incorrect password.");
    }
  };

  // Add Category (POST)
  const addCategory = async (name, budget) => {
    if (!name || budget <= 0) return alert("Please enter valid inputs.");

    try {
      const res = await axios.post(`${API_URL}/categories`, { name, budget });
      console.log("Category Added: ", res.data); // Debugging response
      setCategories(prev => [...prev, res.data]); // Update state with the newly added category
    } catch (err) {
      console.error("Error adding category:", err);
      alert("Failed to add category.");
    }
  };

  // Add Expense (POST)
  const addExpense = async (categoryName, amount) => {
    const category = categories.find(cat => cat.name === categoryName);
    if (!category) return;

    try {
      const res = await axios.post(`${API_URL}/expenses`, {
        amount,
        categoryId: category._id,
      });
      console.log("Expense Added: ", res.data); // Debugging response

      const updatedCategory = {
        ...category,
        spent: category.spent + amount,
        expenses: [...category.expenses, res.data],
      };

      setCategories(prev =>
        prev.map(cat => (cat._id === category._id ? updatedCategory : cat))
      );
    } catch (err) {
      console.error("Error adding expense:", err);
      alert("Failed to add expense.");
    }
  };

  // Remove Expense (DELETE)
  const removeExpense = async (categoryName, expenseId) => {
    if (!window.confirm("Are you sure?")) return;

    try {
      await axios.delete(`${API_URL}/expenses/${expenseId}`);
      console.log("Expense Removed:", expenseId); // Debugging

      const updatedCategories = categories.map(cat => {
        if (cat.name !== categoryName) return cat;
        const updatedExpenses = cat.expenses.filter(e => e._id !== expenseId);
        const spentReduction = cat.expenses.find(e => e._id === expenseId)?.amount || 0;
        return { ...cat, spent: cat.spent - spentReduction, expenses: updatedExpenses };
      });

      setCategories(updatedCategories);
    } catch (err) {
      console.error("Error removing expense:", err);
      alert("Failed to remove expense.");
    }
  };

  const toggleExpenses = (categoryName) => {
    setShowExpenses((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  // Remove Category (DELETE)
  const removeCategory = async (categoryName) => {
    if (!window.confirm("Delete this category?")) return;
    const category = categories.find(cat => cat.name === categoryName);
    if (!category) return;

    try {
      await axios.delete(`${API_URL}/categories/${category._id}`);
      console.log("Category Removed:", category._id); // Debugging

      setCategories(prev => prev.filter(cat => cat._id !== category._id));
    } catch (err) {
      console.error("Error deleting category:", err);
      alert("Failed to delete category.");
    }
  };

  if (!isAuthenticated && localStorage.getItem("budgetAppLoggedIn") !== "true") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form
          onSubmit={handleLogin}
          className="bg-white p-6 rounded shadow-md space-y-4 w-80"
        >
          <h2 className="text-xl font-bold text-center">Enter Password</h2>
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-blue-600">Monthly Budget</h1>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              localStorage.removeItem("budgetAppLoggedIn");
              window.location.reload();
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <Dashboard totalBudget={totalBudget} totalSpent={totalSpent} remainingBalance={remainingBalance} />
        
        {/* Button to toggle Add Category form visibility */}
        <button
          onClick={() => setShowAddCategoryForm((prev) => !prev)}
          className="mt-4 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          {showAddCategoryForm ? "Cancel" : "Add New Category"}
        </button>
        
        {/* Conditionally render Add Category form */}
        {showAddCategoryForm && <AddCategoryForm onAddCategory={addCategory} />}
        
        <Categories
          categories={categories}
          onRemoveExpense={removeExpense}
          showExpenses={showExpenses}
          toggleExpenses={toggleExpenses}
          onRemoveCategory={removeCategory}
        />
        <ExpenseForm categories={categories} onAddExpense={addExpense} />
      </div>
    </div>
  );
}

function Dashboard({ totalBudget, totalSpent, remainingBalance }) {
  return (
    <div className="mt-4 p-4 bg-blue-100 rounded-lg text-center">
      <h2 className="text-xl font-bold text-blue-700">Dashboard</h2>
      <p className="text-gray-700">Total Budget: ${totalBudget.toFixed(2)}</p>
      <p className="text-gray-700">Total Spent: ${totalSpent.toFixed(2)}</p>
      <p className="text-gray-700">Remaining Balance: ${remainingBalance.toFixed(2)}</p>
    </div>
  );
}

function AddCategoryForm({ onAddCategory }) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddCategory(name, parseFloat(budget));
    setName("");
    setBudget("");
  };

  return (
    <div className="mt-4">
      <h2 className="text-lg font-bold text-gray-800">Add New Category</h2>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Budget amount"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">
          Add Category
        </button>
      </form>
    </div>
  );
}

function Categories({ categories, onRemoveExpense, showExpenses, toggleExpenses, onRemoveCategory }) {
  const [showDeleteButton, setShowDeleteButton] = useState(null); // Track which expense's delete button to show

  const handleExpenseClick = (expenseId) => {
    setShowDeleteButton(expenseId); // Show delete button for clicked expense
  };

  const handleExpenseRemoveClick = (e, expenseId) => {
    e.stopPropagation(); // Prevent click from triggering the category toggle
    onRemoveExpense(expenseId); // Call remove expense function
    setShowDeleteButton(null); // Hide the delete button after removal
  };
  
  return (
    <div className="mt-4">
      <h2 className="text-lg font-bold text-gray-800">Categories</h2>
      <div className="space-y-2">
        {categories.map((cat, index) => (
          <div key={index} className="flex flex-col space-y-2">
            <div
              className="flex items-center justify-between p-3 bg-gray-200 rounded-md cursor-pointer"
              onClick={() => toggleExpenses(cat.name)}
            >
              <div className="flex-1">
                <div className="font-semibold">{cat.name}</div>
                <div className="text-sm text-gray-700">
                  ${cat.spent.toFixed(2)} / ${cat.budget.toFixed(2)}
                </div>
                <div className="w-full h-2 bg-gray-300 rounded mt-1">
                  <div
                    className={`h-2 rounded ${cat.spent >= cat.budget ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{
                      width: `${Math.min((cat.spent / cat.budget) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
              {showExpenses[cat.name] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveCategory(cat.name);
                  }}
                  className="ml-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              )}
            </div>


            {showExpenses[cat.name] && (
              <div className="bg-gray-100 p-2 rounded-md">
                {cat.expenses.map((expense) => (
                  <div key={expense._id} className="flex flex-col space-y-1 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Expense: ${Number(expense.amount).toFixed(2)}</span>
                      <button
                        onClick={() => onRemoveExpense(cat.name, expense._id)}
                        className="bg-red-500 text-white px-1 py-1 text-xs rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    <span className="text-gray-600">{formatDate(expense.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const formatDate = (isoDateString) => {
  const date = new Date(isoDateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short', // Change to 'long' for full month name
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

function ExpenseForm({ categories, onAddExpense }) {
  const [category, setCategory] = useState(categories[0]?.name || "");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (categories.length > 0) setCategory(categories[0].name);
  }, [categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const expenseAmount = parseFloat(amount);

    if (!category || isNaN(expenseAmount) || expenseAmount <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    onAddExpense(category, expenseAmount);
    setAmount("");
  };

  return (
    <div className="mt-4">
      <h2 className="text-lg font-bold text-gray-800">Add Expense</h2>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {categories.map((cat, index) => (
            <option key={index} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Add Expense
        </button>
      </form>
    </div>
  );
}

export default App;
