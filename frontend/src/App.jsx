import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingDown, 
  TrendingUp,
  DollarSign, 
  Calendar, 
  Tag, 
  Trash2, 
  PlusCircle, 
  Wallet, 
  PieChart as PieIcon, 
  CheckCircle,
  CreditCard,
  Building,
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  PiggyBank,
  Settings,
  Pencil,
  MessageSquare,
  Send,
  X
} from 'lucide-react';

const API_BASE_URL = window.location.origin.includes('5173') 
  ? 'http://localhost:5005/api' 
  : '/api';

// Pastel colors list for custom categories
const PASTEL_COLORS = [
  '#f43f5e', '#3b82f6', '#a855f7', '#eab308', '#ec4899', 
  '#10b981', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [salary, setSalary] = useState(5000);
  const [creditDate, setCreditDate] = useState('2026-07-01');
  
  // Chatbot states
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hi! I am your Nimbus AI Financial Assistant. How can I help you manage your funds today?' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Forms state
  const [txForm, setTxForm] = useState({
    title: '',
    amount: '',
    type: 'debit',
    category: '', 
    accountId: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [salaryForm, setSalaryForm] = useState({
    amount: '5000',
    creditDate: '2026-07-01'
  });

  const [accForm, setAccForm] = useState({
    name: '',
    type: 'Bank',
    balance: ''
  });

  const [catForm, setCatForm] = useState({
    name: '',
    type: 'debit', 
    color: PASTEL_COLORS[0]
  });

  const [budgetForm, setBudgetForm] = useState({
    categoryName: '',
    limitAmount: ''
  });

  const [showAccModal, setShowAccModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSalaryEdit, setShowSalaryEdit] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null);
  
  const [chartTab, setChartTab] = useState('category');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAccount, setFilterAccount] = useState('All');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showChat) {
      scrollToBottom();
    }
  }, [chatMessages, showChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [txRes, accRes, salaryRes, catRes, budgetRes, predictRes] = await Promise.all([
        fetch(`${API_BASE_URL}/transactions`),
        fetch(`${API_BASE_URL}/accounts`),
        fetch(`${API_BASE_URL}/salary`),
        fetch(`${API_BASE_URL}/categories`),
        fetch(`${API_BASE_URL}/budgets`),
        fetch(`${API_BASE_URL}/predict-budgets`)
      ]);

      if (!txRes.ok || !accRes.ok || !salaryRes.ok || !catRes.ok || !budgetRes.ok || !predictRes.ok) {
        throw new Error('Failed to load ledger configuration from server.');
      }

      const txData = await txRes.json();
      const accData = await accRes.json();
      const salaryData = await salaryRes.json();
      const catData = await catRes.json();
      const budgetData = await budgetRes.json();
      const predictData = await predictRes.json();

      setTransactions(txData);
      setAccounts(accData);
      setCategories(catData);
      setBudgets(budgetData);
      setPredictions(predictData);
      setSalary(salaryData.salary);
      setCreditDate(salaryData.creditDate);
      
      setSalaryForm({
        amount: salaryData.salary.toString(),
        creditDate: salaryData.creditDate
      });

      // Default account selection
      let defaultAccId = accData.length > 0 ? accData[0]._id : '';
      
      // Default category selection
      const debitCats = catData.filter(c => c.type === 'debit');
      let defaultCatName = debitCats.length > 0 ? debitCats[0].name : '';

      setTxForm(prev => ({ 
        ...prev, 
        accountId: defaultAccId,
        category: defaultCatName
      }));
    } catch (err) {
      console.error(err);
      setError('Could not connect to the backend server. Please verify your backend server is active.');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType) => {
    const matchedCats = categories.filter(c => c.type === newType);
    const defaultCatName = matchedCats.length > 0 ? matchedCats[0].name : '';
    setTxForm(prev => ({ 
      ...prev, 
      type: newType,
      category: defaultCatName 
    }));
  };

  // Add Account/Card
  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!accForm.name || !accForm.type) {
      alert('Please fill out account parameters');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accForm.name,
          type: accForm.type,
          balance: accForm.balance ? parseFloat(accForm.balance) : 0
        })
      });

      if (!res.ok) throw new Error('Failed to add account');
      const newAcc = await res.json();
      setAccounts(prev => [...prev, newAcc]);
      
      if (accounts.length === 0) {
        setTxForm(prev => ({ ...prev, accountId: newAcc._id }));
      }

      setAccForm({ name: '', type: 'Bank', balance: '' });
      setShowAccModal(false);
      triggerSuccess('Account/Card added successfully!');
    } catch (err) {
      alert('Error creating account');
    }
  };

  // Delete Account
  const handleDeleteAccount = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will delete all associated transactions!`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete account');
      setAccounts(prev => prev.filter(acc => acc._id !== id));
      setTransactions(prev => prev.filter(tx => tx.accountId?._id !== id));
      triggerSuccess('Account removed.');
    } catch (err) {
      alert('Error deleting account');
    }
  };

  // Add Custom Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name || !catForm.type) {
      alert('Please fill out category name');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm)
      });

      if (!res.ok) throw new Error('Failed to add category');
      const newCat = await res.json();
      
      setCategories(prev => [...prev, newCat]);
      
      if (txForm.type === catForm.type) {
        setTxForm(prev => ({ ...prev, category: newCat.name }));
      }

      setCatForm({
        name: '',
        type: 'debit',
        color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
      });
      setShowCatModal(false);
      triggerSuccess('Category registered successfully!');
    } catch (err) {
      alert('Error: Category might already exist.');
    }
  };

  // Set / Update Budget
  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!budgetForm.categoryName || !budgetForm.limitAmount) {
      alert('Please complete budget limits');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: budgetForm.categoryName,
          limitAmount: parseFloat(budgetForm.limitAmount)
        })
      });

      if (!res.ok) throw new Error('Failed to set budget');
      
      await fetchData();
      setShowBudgetModal(false);
      triggerSuccess('Monthly budget limit configured!');
    } catch (err) {
      alert('Error saving budget configurations');
    }
  };

  // Apply Recommended Budget from AI
  const handleApplyRecommendedBudget = async (categoryName, limitAmount) => {
    try {
      const res = await fetch(`${API_BASE_URL}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryName, limitAmount })
      });

      if (!res.ok) throw new Error('Failed to apply budget suggestion');
      
      await fetchData();
      triggerSuccess(`AI Suggested Budget applied for ${categoryName}!`);
    } catch (err) {
      alert('Error applying budget recommendations');
    }
  };

  // Add/Edit Transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    const { title, amount, type, category, accountId, date } = txForm;
    if (!title || !amount || !accountId || !category || !date) {
      alert('Please complete transaction details');
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please input a valid amount');
      return;
    }

    try {
      let res;
      if (editingTxId) {
        res = await fetch(`${API_BASE_URL}/transactions/${editingTxId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, amount: amt, type, category, accountId, date })
        });
      } else {
        res = await fetch(`${API_BASE_URL}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, amount: amt, type, category, accountId, date })
        });
      }

      if (!res.ok) throw new Error('Failed to register transaction');
      
      await fetchData();

      setTxForm(prev => ({
        ...prev,
        title: '',
        amount: ''
      }));
      setEditingTxId(null);
      triggerSuccess(editingTxId ? 'Transaction updated!' : 'Ledger entry added!');
    } catch (err) {
      alert('Error logging transaction');
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction record and adjust account balance?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete transaction');
      
      await fetchData();
      triggerSuccess('Transaction deleted and balance adjusted.');
    } catch (err) {
      alert('Error deleting transaction');
    }
  };

  // Handle Edit Click
  const handleEditClick = (tx) => {
    setEditingTxId(tx._id);
    setTxForm({
      title: tx.title,
      amount: tx.amount.toString(),
      type: tx.type,
      category: tx.category,
      accountId: tx.accountId?._id || '',
      date: tx.date
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update Salary Configuration
  const handleUpdateSalary = async (e) => {
    e.preventDefault();
    const amt = parseFloat(salaryForm.amount);
    const dateStr = salaryForm.creditDate;

    if (isNaN(amt) || amt <= 0 || !dateStr) {
      alert('Please enter a valid salary amount and select a credit date.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salary: amt, creditDate: dateStr })
      });

      if (!res.ok) throw new Error('Failed to update salary config');
      const data = await res.json();
      setSalary(data.salary);
      setCreditDate(data.creditDate);
      setShowSalaryEdit(false);
      triggerSuccess('Salary configuration saved!');
    } catch (err) {
      alert('Error updating monthly income configuration.');
    }
  };

  // Chatbot submission handler
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });

      if (!res.ok) throw new Error('Chatbot backend error');
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I am facing connectivity issues. Please try again later.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Option select handler for quick-reply option chips
  const handleSelectOption = async (optionText, apiQuery) => {
    if (chatLoading) return;
    setChatMessages(prev => [...prev, { sender: 'user', text: optionText }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: apiQuery })
      });

      if (!res.ok) throw new Error('Chatbot backend error');
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I am facing connectivity issues. Please try again later.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Filter Categories list based on active forms
  const debitCategories = categories.filter(c => c.type === 'debit');
  const creditCategories = categories.filter(c => c.type === 'credit');

  // Dynamic category distinct color allocation mapping to prevent duplicate colors in UI
  const categoryColorMap = {};
  debitCategories.forEach((cat, index) => {
    categoryColorMap[cat.name] = PASTEL_COLORS[index % PASTEL_COLORS.length];
  });
  creditCategories.forEach((cat, index) => {
    categoryColorMap[cat.name] = PASTEL_COLORS[(index + 3) % PASTEL_COLORS.length];
  });

  // Calculations
  const totalBalance = accounts.reduce((sum, acc) => {
    if (acc.type === 'Credit Card') return sum - acc.balance;
    return sum + acc.balance;
  }, 0);

  const totalCredits = transactions
    .filter(tx => tx.type === 'credit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalDebits = transactions
    .filter(tx => tx.type === 'debit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netSavings = salary - totalDebits;
  const savingsPercent = salary > 0 ? (netSavings / salary) * 100 : 0;
  const spendRatio = Math.min(100, (totalDebits / salary) * 100);

  // Filtered transactions list
  const filteredTx = transactions.filter(tx => {
    const matchesCat = filterCategory === 'All' || tx.category === filterCategory;
    const matchesAcc = filterAccount === 'All' || tx.accountId?._id === filterAccount;
    return matchesCat && matchesAcc;
  });

  const getAccountIcon = (type) => {
    switch (type) {
      case 'Bank': return <Building size={16} />;
      case 'Credit Card': return <CreditCard size={16} />;
      default: return <Coins size={16} />;
    }
  };

  // Dynamic Pie Chart categorizations
  const expenseSummary = debitCategories.map(cat => {
    const total = transactions
      .filter(tx => tx.type === 'debit' && tx.category === cat.name)
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { ...cat, total, color: categoryColorMap[cat.name] || cat.color || '#94a3b8' };
  }).filter(cat => cat.total > 0);

  let accumulatedPercent = 0;
  const donutSlices = expenseSummary.map(cat => {
    const percent = totalDebits > 0 ? (cat.total / totalDebits) * 100 : 0;
    const startPercent = accumulatedPercent;
    accumulatedPercent += percent;
    return { ...cat, percent, startPercent };
  });

  // Group debits by month
  const monthlySummaryMap = {};
  transactions
    .filter(tx => tx.type === 'debit')
    .forEach(tx => {
      if (!tx.date) return;
      const parts = tx.date.split('-');
      if (parts.length < 2) return;
      const year = parts[0];
      const monthIndex = parseInt(parts[1]) - 1;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthLabel = `${monthNames[monthIndex]} ${year}`;
      
      monthlySummaryMap[monthLabel] = (monthlySummaryMap[monthLabel] || 0) + tx.amount;
    });

  const monthlySummary = Object.keys(monthlySummaryMap).map(month => ({
    month,
    total: monthlySummaryMap[month]
  })).sort((a, b) => {
    const parseMonth = (mStr) => {
      const parts = mStr.split(' ');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return new Date(parseInt(parts[1]), monthNames.indexOf(parts[0]), 1);
    };
    return parseMonth(b.month) - parseMonth(a.month);
  });

  const maxMonthlySpent = monthlySummary.length > 0 ? Math.max(...monthlySummary.map(m => m.total)) : 1;

  // Compute active budget alert triggers
  const budgetAlerts = debitCategories.map(cat => {
    const total = transactions
      .filter(tx => tx.type === 'debit' && tx.category === cat.name)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const budget = budgets.find(b => b.categoryName === cat.name);
    if (!budget || budget.limitAmount <= 0) return null;

    const percentUsed = (total / budget.limitAmount) * 100;
    if (percentUsed >= 100) {
      return { category: cat.name, text: `Overrun: ₹${total.toFixed(0)} of ₹${budget.limitAmount.toFixed(0)} spent under ${cat.name}!`, type: 'danger' };
    } else if (percentUsed >= 80) {
      return { category: cat.name, text: `Warning: ${percentUsed.toFixed(0)}% of ₹${budget.limitAmount.toFixed(0)} spent under ${cat.name}.`, type: 'warning' };
    }
    return null;
  }).filter(Boolean);

  const getProgressColorClass = () => {
    if (spendRatio < 60) return 'safe';
    if (spendRatio < 80) return 'warning';
    return 'danger';
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">N</div>
          <div>
            <h1 className="brand-title">Nimbus Wallet</h1>
            <span className="brand-tag">Custom Multi-Account Planner</span>
          </div>
        </div>
        
        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '14px', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
            <CheckCircle size={16} />
            {successMsg}
          </div>
        )}
      </header>

      {error && (
        <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '16px', borderRadius: '12px', fontSize: '14px' }}>
          {error}
          <button onClick={fetchData} style={{ marginLeft: '12px', background: '#f43f5e', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
            Retry Connecting
          </button>
        </div>
      )}

      {/* Health Checks & Dynamic Budget Alerts */}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {savingsPercent < 20 && savingsPercent >= 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}>
              <AlertTriangle size={18} />
              <span><strong>Advisory:</strong> Your savings rate ({savingsPercent.toFixed(1)}%) is below the recommended 20%. Try to review non-essential expenses.</span>
            </div>
          )}
          {netSavings < 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}>
              <AlertTriangle size={18} />
              <span><strong>Warning:</strong> You are spending more than your monthly salary! Negative net monthly balance.</span>
            </div>
          )}
          {budgetAlerts.map(alert => (
            <div 
              key={alert.category} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                background: alert.type === 'danger' ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)', 
                border: alert.type === 'danger' ? '1px solid rgba(244,63,94,0.2)' : '1px solid rgba(245,158,11,0.2)', 
                color: alert.type === 'danger' ? '#f43f5e' : '#f59e0b', 
                padding: '12px 16px', 
                borderRadius: '12px', 
                fontSize: '14px' 
              }}
            >
              <AlertTriangle size={18} />
              <span><strong>Budget Alert ({alert.category}):</strong> {alert.text}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textBaseline: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <p>Syncing dashboard ledger records...</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          
          {/* LEFT COLUMN */}
          <div className="main-column">
            
            {/* Net Available Wealth */}
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="metric-label">Net Available Wealth</span>
                <span className="metric-value" style={{ color: totalBalance >= 0 ? 'var(--color-brand)' : 'var(--color-danger)', display: 'block', fontSize: '36px', marginTop: '4px' }}>
                  ₹{totalBalance.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', color: 'var(--color-brand)' }}>
                    <ArrowUpRight size={14} /> Total Credits
                  </span>
                  <span style={{ fontWeight: '700', fontSize: '18px' }}>+₹{totalCredits.toFixed(2)}</span>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                  <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', color: 'var(--color-danger)' }}>
                    <ArrowDownRight size={14} /> Total Debits
                  </span>
                  <span style={{ fontWeight: '700', fontSize: '18px' }}>-₹{totalDebits.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Income Configuration */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Monthly Income (Salary)</h3>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#6366f1', marginTop: '2px' }}>
                    ₹{salary.toFixed(2)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Salary Credit Date</span>
                    <p style={{ fontWeight: 700, fontSize: '15px', color: '#10b981', marginTop: '2px' }}>
                      {creditDate}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowSalaryEdit(!showSalaryEdit)} 
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Configure Salary Settings"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              {showSalaryEdit && (
                <form onSubmit={handleUpdateSalary} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', gap: '12px', marginBottom: '14px', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Monthly Salary (₹)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={salaryForm.amount} 
                      onChange={e => setSalaryForm(prev => ({ ...prev, amount: e.target.value }))}
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Salary Credit Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={salaryForm.creditDate} 
                      onChange={e => setSalaryForm(prev => ({ ...prev, creditDate: e.target.value }))}
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" className="btn-update" style={{ padding: '9px 14px', fontSize: '13px' }}>Save</button>
                  </div>
                </form>
              )}

              <div className="progress-container">
                <div 
                  className={`progress-bar ${getProgressColorClass()}`} 
                  style={{ width: `${spendRatio}%` }}
                ></div>
              </div>
              <div className="budget-status-text">
                <span>{spendRatio.toFixed(0)}% of salary spent</span>
                <span>Remaining Savings: ₹{netSavings.toFixed(2)} ({savingsPercent.toFixed(0)}%)</span>
              </div>
            </div>

            {/* Accounts & Cards */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Accounts & Cards</h3>
                <button 
                  className="btn-update" 
                  onClick={() => setShowAccModal(true)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  + Add Account/Card
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {accounts.map(acc => (
                  <div key={acc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: acc.type === 'Credit Card' ? '#ec4899' : '#6366f1', background: 'rgba(255,255,255,0.04)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getAccountIcon(acc.type)}
                      </div>
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '14px' }}>{acc.name}</p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{acc.type}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: acc.type === 'Credit Card' ? '#f43f5e' : '#fff' }}>
                        {acc.type === 'Credit Card' ? `-₹${acc.balance.toFixed(2)}` : `₹${acc.balance.toFixed(2)}`}
                      </span>
                      {accounts.length > 1 && (
                        <button 
                          onClick={() => handleDeleteAccount(acc._id, acc.name)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending Chart card */}
            <div className="glass-card chart-container">
              <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="chart-title" style={{ fontSize: '18px', fontWeight: '700' }}>Spending Analysis</h3>
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => setChartTab('category')}
                    style={{ background: chartTab === 'category' ? 'rgba(99,102,241,0.15)' : 'transparent', border: 'none', color: chartTab === 'category' ? '#6366f1' : 'var(--text-secondary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Category-wise
                  </button>
                  <button 
                    onClick={() => setChartTab('monthly')}
                    style={{ background: chartTab === 'monthly' ? 'rgba(99,102,241,0.15)' : 'transparent', border: 'none', color: chartTab === 'monthly' ? '#6366f1' : 'var(--text-secondary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Month-wise
                  </button>
                  <button 
                    onClick={() => setChartTab('forecast')}
                    style={{ background: chartTab === 'forecast' ? 'rgba(99,102,241,0.15)' : 'transparent', border: 'none', color: chartTab === 'forecast' ? '#6366f1' : 'var(--text-secondary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    AI Forecast 💡
                  </button>
                </div>
              </div>

              {totalDebits === 0 ? (
                <div className="empty-state">
                  <p>No debits logged to visualize spending allocations.</p>
                </div>
              ) : chartTab === 'category' ? (
                <div className="custom-chart-wrapper" style={{ flexWrap: 'wrap' }}>
                  <svg width="220" height="220" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                    {donutSlices.map((slice) => {
                      const strokeDasharray = `${slice.percent} ${100 - slice.percent}`;
                      const strokeDashoffset = 100 - slice.startPercent;
                      return (
                        <circle
                          key={slice._id || slice.name}
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke={slice.color}
                          strokeWidth="3.2"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap={slice.percent > 2 ? 'round' : 'butt'}
                          style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                      );
                    })}
                  </svg>
                  
                  <div style={{ marginLeft: '24px', flexGrow: '1', minWidth: '220px' }}>
                    <div className="chart-legend">
                      {donutSlices.map(slice => {
                        const matchedBudget = budgets.find(b => b.categoryName === slice.name);
                        const hasBudget = matchedBudget && matchedBudget.limitAmount > 0;
                        const budgetRatio = hasBudget ? (slice.total / matchedBudget.limitAmount) * 100 : 0;
                        
                        return (
                          <div key={slice._id || slice.name} className="legend-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="legend-color" style={{ backgroundColor: slice.color }}></span>
                                <span style={{ fontWeight: '600' }}>{slice.name}</span>
                              </div>
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                ₹{slice.total.toFixed(0)} ({slice.percent.toFixed(0)}%)
                              </span>
                            </div>

                            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginTop: '2px' }}>
                              {hasBudget ? (
                                <>
                                  <span style={{ color: budgetRatio >= 100 ? '#f43f5e' : (budgetRatio >= 80 ? '#f59e0b' : 'var(--text-muted)') }}>
                                    Budget: ₹{slice.total.toFixed(0)} / ₹{matchedBudget.limitAmount.toFixed(0)} ({budgetRatio.toFixed(0)}%)
                                  </span>
                                  <button 
                                    onClick={() => {
                                      setBudgetForm({ categoryName: slice.name, limitAmount: matchedBudget.limitAmount.toString() });
                                      setShowBudgetModal(true);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-brand)', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                                  >
                                    Adjust
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No monthly budget limit</span>
                                  <button 
                                    onClick={() => {
                                      setBudgetForm({ categoryName: slice.name, limitAmount: '' });
                                      setShowBudgetModal(true);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-brand)', cursor: 'pointer', fontSize: '10px', padding: 0, fontWeight: '600' }}
                                  >
                                    + Set Budget
                                  </button>
                                </>
                              )}
                            </div>

                            {hasBudget && (
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', overflow: 'hidden', marginTop: '2px' }}>
                                <div 
                                  style={{ 
                                    width: `${Math.min(100, budgetRatio)}%`, 
                                    height: '100%', 
                                    background: budgetRatio >= 100 ? '#f43f5e' : (budgetRatio >= 80 ? '#f59e0b' : '#10b981'),
                                    borderRadius: '99px' 
                                  }}
                                ></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : chartTab === 'monthly' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                  {monthlySummary.map(item => {
                    const relativeWidth = Math.max(8, (item.total / maxMonthlySpent) * 100);
                    return (
                      <div key={item.month} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600' }}>
                          <span>{item.month}</span>
                          <span style={{ color: 'var(--color-danger)' }}>₹{item.total.toFixed(2)}</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div 
                            style={{ width: `${relativeWidth}%`, height: '100%', background: 'linear-gradient(90deg, #f43f5e, #e11d48)', borderRadius: '99px', transition: 'width 0.4s ease' }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                  <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PiggyBank size={16} style={{ color: '#6366f1' }} />
                    <span>AI analyzes your transaction history to predict expected expenses and suggest optimal limits.</span>
                  </div>
                  {predictions.map(pred => {
                    const trendIcon = pred.trend === 'up' ? '📈 Rising' : (pred.trend === 'down' ? '📉 Falling' : '➖ Stable');
                    const trendColor = pred.trend === 'up' ? '#f43f5e' : (pred.trend === 'down' ? '#10b981' : '#f59e0b');

                    return (
                      <div key={pred.categoryName} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: pred.color }}></span>
                            <span style={{ fontWeight: '700', fontSize: '14px' }}>{pred.categoryName}</span>
                          </div>
                          <span style={{ fontSize: '11px', background: `${trendColor}15`, color: trendColor, padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>
                            {trendIcon}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Predicted Spend: <strong style={{ color: '#fff' }}>₹{pred.predictedSpend}</strong> ({pred.reason})
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', background: 'rgba(0,0,0,0.15)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Suggested Budget</span>
                            <strong style={{ fontSize: '14px', color: '#10b981' }}>₹{pred.recommendedBudget}</strong>
                          </div>
                          {pred.currentBudget === pred.recommendedBudget ? (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Suggestion Applied</span>
                          ) : (
                            <button
                              onClick={() => handleApplyRecommendedBudget(pred.categoryName, pred.recommendedBudget)}
                              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="main-column">
            
            {/* Record Transaction Card */}
            <div className="glass-card">
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={18} style={{ color: editingTxId ? 'var(--color-warning)' : 'var(--color-brand)' }} />
                {editingTxId ? 'Edit Transaction' : 'Record Transaction'}
              </h2>
              
              <form onSubmit={handleAddTransaction}>
                
                <div className="form-group" style={{ flexDirection: 'row', gap: '12px', margin: '10px 0 20px 0' }}>
                  <button 
                    type="button"
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid', borderColor: txForm.type === 'debit' ? 'var(--color-danger)' : 'var(--border-color)', background: txForm.type === 'debit' ? 'rgba(244,63,94,0.1)' : 'transparent', color: txForm.type === 'debit' ? '#f43f5e' : 'var(--text-secondary)', fontWeight: 700 }}
                    onClick={() => handleTypeChange('debit')}
                  >
                    Debit (Expense)
                  </button>
                  <button 
                    type="button"
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid', borderColor: txForm.type === 'credit' ? 'var(--color-brand)' : 'var(--border-color)', background: txForm.type === 'credit' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: txForm.type === 'credit' ? '#10b981' : 'var(--text-secondary)', fontWeight: 700 }}
                    onClick={() => handleTypeChange('credit')}
                  >
                    Credit (Income)
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Transaction Label</label>
                  <input 
                    type="text" 
                    placeholder={txForm.type === 'debit' ? "e.g., Grocery store, Gas station" : "e.g., Monthly salary payment, Dividends"} 
                    className="form-control"
                    value={txForm.title}
                    onChange={e => setTxForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      className="form-control"
                      value={txForm.amount}
                      onChange={e => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Category</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          setCatForm(prev => ({ ...prev, type: txForm.type }));
                          setShowCatModal(true);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-brand)', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        + Add Custom
                      </button>
                    </div>
                    <select 
                      className="form-control"
                      value={txForm.category}
                      onChange={e => setTxForm(prev => ({ ...prev, category: e.target.value }))}
                      required
                    >
                      {txForm.type === 'debit' 
                        ? debitCategories.map(cat => <option key={cat._id} value={cat.name}>{cat.name}</option>)
                        : creditCategories.map(cat => <option key={cat._id} value={cat.name}>{cat.name}</option>)
                      }
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Select Account / Card</label>
                    <select 
                      className="form-control"
                      value={txForm.accountId}
                      onChange={e => setTxForm(prev => ({ ...prev, accountId: e.target.value }))}
                      required
                    >
                      {accounts.map(acc => (
                        <option key={acc._id} value={acc._id}>{acc.name} ({acc.type})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={txForm.date}
                      onChange={e => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button 
                    type="submit" 
                    className="btn-submit" 
                    style={{ 
                      background: editingTxId 
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                        : (txForm.type === 'debit' ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'linear-gradient(135deg, #10b981, #059669)'), 
                      marginTop: 0 
                    }}
                  >
                    {editingTxId ? 'Update Ledger' : `Log ${txForm.type === 'debit' ? 'Debit' : 'Credit'}`}
                  </button>
                  {editingTxId && (
                    <button
                      type="button"
                      className="btn-submit"
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', marginTop: 0 }}
                      onClick={() => {
                        setEditingTxId(null);
                        setTxForm(prev => ({ ...prev, title: '', amount: '' }));
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Ledger List */}
            <div className="glass-card transaction-list-section">
              <div className="list-header">
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Transaction Ledger</h3>
                
                <div className="filter-row">
                  <select 
                    className="filter-select"
                    value={filterAccount}
                    onChange={e => setFilterAccount(e.target.value)}
                  >
                    <option value="All">All Accounts</option>
                    {accounts.map(acc => (
                      <option key={acc._id} value={acc._id}>{acc.name}</option>
                    ))}
                  </select>

                  <select 
                    className="filter-select"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="transactions-scroll">
                {filteredTx.length === 0 ? (
                  <div className="empty-state">
                    <p>No transaction history matching filter criteria.</p>
                  </div>
                ) : (
                  filteredTx.map(tx => {
                    const isCredit = tx.type === 'credit';
                    const matchedCat = categories.find(c => c.name === tx.category) || { name: tx.category, color: '#94a3b8' };
                    const matchedCatColor = categoryColorMap[tx.category] || matchedCat.color || '#94a3b8';
                    
                    return (
                      <div key={tx._id} className="transaction-item">
                        <div className="tx-info">
                          <div className="tx-icon-wrapper" style={{ color: isCredit ? '#10b981' : '#f43f5e', background: isCredit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244,63,94,0.08)' }}>
                            {isCredit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          </div>
                          <div className="tx-details">
                            <span className="tx-title">{tx.title}</span>
                            <span className="tx-meta" style={{ flexWrap: 'wrap', gap: '8px' }}>
                              <span>{tx.date}</span>
                              
                              <span className="tx-category-badge" style={{ background: `${matchedCatColor}18`, color: matchedCatColor, border: `1px solid ${matchedCatColor}35` }}>
                                {matchedCat.name}
                              </span>

                              <span className="tx-category-badge" style={{ background: tx.accountId?.type === 'Credit Card' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(99, 102, 241, 0.1)', color: tx.accountId?.type === 'Credit Card' ? '#ec4899' : '#6366f1', border: tx.accountId?.type === 'Credit Card' ? '1px solid rgba(236, 72, 153, 0.2)' : '1px solid rgba(99, 102, 241, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {getAccountIcon(tx.accountId?.type)}
                                {tx.accountId?.name || 'Unknown Source'}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="tx-actions">
                          <span className="tx-amount" style={{ color: isCredit ? '#10b981' : '#f43f5e' }}>
                            {isCredit ? `+₹${tx.amount.toFixed(2)}` : `-₹${tx.amount.toFixed(2)}`}
                          </span>
                          <button 
                            className="btn-delete-tx"
                            onClick={() => handleEditClick(tx)}
                            title="Edit entry"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            className="btn-delete-tx"
                            onClick={() => handleDeleteTransaction(tx._id)}
                            title="Delete entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING CHATBOT WIDGET */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
        
        {/* Chat Window Panel */}
        {showChat && (
          <div style={{ width: '360px', height: '480px', background: 'rgba(23, 27, 44, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Chat Header */}
            <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></div>
                <strong style={{ fontSize: '14px' }}>Nimbus AI Assistant</strong>
              </div>
              <button 
                onClick={() => setShowChat(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.map((msg, index) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div 
                    key={index} 
                    style={{ 
                      alignSelf: isBot ? 'flex-start' : 'flex-end',
                      maxWidth: '85%',
                      background: isBot ? 'rgba(255,255,255,0.05)' : '#6366f1',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: isBot ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      border: isBot ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {msg.text}
                  </div>
                );
              })}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', fontSize: '13px', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  Nimbus AI is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Suggestion Chips */}
            <div style={{ display: 'flex', gap: '8px', padding: '8px 16px', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.03)', background: 'rgba(0,0,0,0.1)', scrollbarWidth: 'none' }}>
              {[
                { label: "💰 Check Net Wealth", query: "what is my balance?" },
                { label: "📊 Outflow Summary", query: "how much did I spend this month?" },
                { label: "🚨 Check Budgets", query: "check my budgets" },
                { label: "💡 Savings Advice", query: "give me savings advice" }
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleSelectOption(opt.label, opt.query)}
                  style={{ 
                    whiteSpace: 'nowrap', 
                    background: 'rgba(99, 102, 241, 0.12)', 
                    border: '1px solid rgba(99, 102, 241, 0.25)', 
                    borderRadius: '20px', 
                    padding: '6px 12px', 
                    fontSize: '11px', 
                    color: '#c7d2fe', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: '600'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendChatMessage} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Ask e.g. 'what is my balance?'"
                className="form-control"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: '#fff' }}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                disabled={chatLoading}
              >
                <Send size={14} />
              </button>
            </form>

          </div>
        )}

        {/* Floating Bubble Button */}
        <button 
          onClick={() => setShowChat(!showChat)}
          style={{ 
            width: '54px', 
            height: '54px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
            color: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            justify: 'center', 
            cursor: 'pointer', 
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
            border: 'none',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            outline: 'none'
          }}
          className="chatbot-bubble-btn"
          title="Nimbus AI Financial Assistant"
        >
          {showChat ? <X size={22} /> : <MessageSquare size={22} />}
        </button>

      </div>

      {/* ADD ACCOUNT POPUP MODAL */}
      {showAccModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Add Account or Credit Card</h3>
            <form onSubmit={handleAddAccount}>
              <div className="form-group">
                <label className="form-label">Account/Card Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Chase Checking, Visa Credit Card" 
                  className="form-control"
                  value={accForm.name}
                  onChange={e => setAccForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Type</label>
                <select 
                  className="form-control"
                  value={accForm.type}
                  onChange={e => setAccForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="Bank">Bank Account</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Wallet">Cash / Other Wallet</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Initial Balance (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  className="form-control"
                  value={accForm.balance}
                  onChange={e => setAccForm(prev => ({ ...prev, balance: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn-update" style={{ flex: 1 }}>Add Account</button>
                <button 
                  type="button" 
                  onClick={() => setShowAccModal(false)}
                  style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  className="btn-update"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CATEGORY POPUP MODAL */}
      {showCatModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Add Custom Category</h3>
            <form onSubmit={handleAddCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Medical, Subscriptions, Fuel" 
                  className="form-control"
                  value={catForm.name}
                  onChange={e => setCatForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select 
                  className="form-control"
                  value={catForm.type}
                  onChange={e => setCatForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="debit">Debit (Expense)</option>
                  <option value="credit">Credit (Income)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Category Color Tag</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {PASTEL_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatForm(prev => ({ ...prev, color }))}
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        background: color, 
                        border: catForm.color === color ? '3px solid #fff' : 'none', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                      }}
                    ></button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn-update" style={{ flex: 1 }}>Create Category</button>
                <button 
                  type="button" 
                  onClick={() => setShowCatModal(false)}
                  style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  className="btn-update"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE CATEGORY BUDGET MODAL */}
      {showBudgetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Configure Budget for "{budgetForm.categoryName}"</h3>
            <form onSubmit={handleSetBudget}>
              <div className="form-group">
                <label className="form-label">Monthly Limit (₹)</label>
                <input 
                  type="number" 
                  step="1"
                  placeholder="e.g., 5000, 10000" 
                  className="form-control"
                  value={budgetForm.limitAmount}
                  onChange={e => setBudgetForm(prev => ({ ...prev, limitAmount: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn-update" style={{ flex: 1 }}>Save Budget Limit</button>
                <button 
                  type="button" 
                  onClick={() => setShowBudgetModal(false)}
                  style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  className="btn-update"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
