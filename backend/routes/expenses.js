const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Salary = require('../models/Salary');
const Category = require('../models/Category');
const Budget = require('../models/Budget');

// --- ACCOUNT ROUTES ---

// Get all accounts
router.get('/accounts', async (req, res) => {
  try {
    let accounts = await Account.find();
    if (accounts.length === 0) {
      const defaults = [
        { name: 'Main Savings Bank', type: 'Bank', balance: 5000 },
        { name: 'Visa Gold Credit Card', type: 'Credit Card', balance: 0 },
        { name: 'Cash Wallet', type: 'Wallet', balance: 200 }
      ];
      accounts = await Account.insertMany(defaults);
    }
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new account/card
router.post('/accounts', async (req, res) => {
  const { name, type, balance } = req.body;
  try {
    const newAccount = new Account({ 
      name, 
      type, 
      balance: balance ? parseFloat(balance) : 0 
    });
    const saved = await newAccount.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete account
router.delete('/accounts/:id', async (req, res) => {
  try {
    const deleted = await Account.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Account not found' });
    await Transaction.deleteMany({ accountId: req.params.id });
    res.json({ message: 'Account and associated transactions deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- CATEGORY ROUTES ---

// Get all categories (or seed defaults)
router.get('/categories', async (req, res) => {
  try {
    let categories = await Category.find();
    if (categories.length === 0) {
      const defaults = [
        // Debit (Expenses)
        { name: 'Food & Groceries', type: 'debit', color: '#f43f5e' },
        { name: 'Bills & Utilities', type: 'debit', color: '#3b82f6' },
        { name: 'Leisure & Entertainment', type: 'debit', color: '#a855f7' },
        { name: 'Transport & Fuel', type: 'debit', color: '#eab308' },
        { name: 'Shopping', type: 'debit', color: '#ec4899' },
        { name: 'Other Expenses', type: 'debit', color: '#94a3b8' },
        
        // Credit (Income)
        { name: 'Monthly Salary', type: 'credit', color: '#10b981' },
        { name: 'Investments', type: 'credit', color: '#6366f1' },
        { name: 'Other Income', type: 'credit', color: '#3b82f6' }
      ];
      categories = await Category.insertMany(defaults);
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new custom category
router.post('/categories', async (req, res) => {
  const { name, type, color } = req.body;
  try {
    const newCategory = new Category({ 
      name, 
      type, 
      color: color || '#94a3b8'
    });
    const saved = await newCategory.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete custom category
router.delete('/categories/:id', async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- BUDGET ROUTES ---

// Get all budgets
router.get('/budgets', async (req, res) => {
  try {
    const budgets = await Budget.find();
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add/Update budget limit
router.post('/budgets', async (req, res) => {
  const { categoryName, limitAmount } = req.body;
  try {
    const budget = await Budget.findOneAndUpdate(
      { categoryName },
      { limitAmount: parseFloat(limitAmount) },
      { new: true, upsert: true }
    );
    res.json(budget);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// GET AI predicted budgets based on history
router.get('/predict-budgets', async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: 'debit' });
    const salaryObj = await Salary.findOne() || { amount: 50000 };
    const monthlyIncome = salaryObj.amount;

    const categories = await Category.find({ type: 'debit' });
    const budgets = await Budget.find();

    // Group transactions by category and month
    const grouped = {};
    transactions.forEach(tx => {
      if (!tx.date) return;
      const parts = tx.date.split('-');
      if (parts.length < 2) return;
      const monthKey = `${parts[0]}-${parts[1]}`; // YYYY-MM
      
      if (!grouped[tx.category]) grouped[tx.category] = {};
      grouped[tx.category][monthKey] = (grouped[tx.category][monthKey] || 0) + tx.amount;
    });

    const predictions = categories.map(cat => {
      const history = grouped[cat.name] || {};
      const months = Object.keys(history).sort(); // chronological list of months
      
      let predictedSpend = 0;
      let trend = 'stable'; // 'up', 'down', 'stable'
      let reason = 'Based on industry standard allocation benchmarks';

      // Default benchmarks if no history exists
      const benchmarkWeights = {
        'Food & Groceries': 0.15,
        'Bills & Utilities': 0.10,
        'Leisure & Entertainment': 0.08,
        'Transport & Fuel': 0.07,
        'Shopping': 0.10,
        'Other Expenses': 0.05
      };

      const defaultWeight = benchmarkWeights[cat.name] || 0.05;
      const baseline = monthlyIncome * defaultWeight;

      if (months.length === 0) {
        predictedSpend = baseline;
        reason = `Baseline benchmark (approx. ${(defaultWeight * 100).toFixed(0)}% of income)`;
      } else if (months.length === 1) {
        predictedSpend = history[months[0]];
        reason = `Matched your logged spend from ${months[0]}`;
        if (predictedSpend > baseline) {
          trend = 'high';
        }
      } else {
        // Simple weighted average
        let totalWeight = 0;
        let weightedSum = 0;
        months.forEach((mKey, idx) => {
          const weight = idx + 1;
          weightedSum += history[mKey] * weight;
          totalWeight += weight;
        });
        predictedSpend = weightedSum / totalWeight;

        // Determine trend looking at last 2 months
        const lastMonthVal = history[months[months.length - 1]];
        const prevMonthVal = history[months[months.length - 2]];
        
        if (lastMonthVal > prevMonthVal * 1.1) {
          trend = 'up';
          reason = `Increasing trend observed over past months`;
        } else if (lastMonthVal < prevMonthVal * 0.9) {
          trend = 'down';
          reason = `Decreasing spend trend observed recently`;
        } else {
          trend = 'stable';
          reason = `Consistent spending patterns detected`;
        }
      }

      // Recommend budget as predicted spend + 15% safety buffer
      const recommendedBudget = Math.ceil(predictedSpend * 1.15 / 100) * 100;
      const currentBudget = budgets.find(b => b.categoryName === cat.name)?.limitAmount || 0;

      return {
        categoryName: cat.name,
        predictedSpend: Math.round(predictedSpend),
        recommendedBudget,
        currentBudget,
        trend,
        reason,
        color: cat.color
      };
    });

    res.json(predictions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /chatbot NLP parsed financial replies using Google Gemini API
router.post('/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ reply: "I didn't receive any message. Try typing something!" });
  }

  try {
    const transactions = await Transaction.find().populate('accountId');
    const accounts = await Account.find();
    const budgets = await Budget.find();
    const categoriesObj = await Category.find();
    const salaryObj = await Salary.findOne() || { amount: 5000 };
    const salary = salaryObj.amount;

    // Check for API Key in environment
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.json({
        reply: `⚠️ **Google Gen AI Studio API Key is missing!**\n\nPlease add \`GEMINI_API_KEY=your_key\` to a \`.env\` file in your backend directory to unlock full LLM capabilities.\n\n*(Current message: "${message}")*`
      });
    }

    const ai = new GoogleGenerativeAI(geminiApiKey);
    
    // Construct database snapshot context for the LLM
    const dbContext = {
      accounts: accounts.map(a => ({ id: a._id, name: a.name, type: a.type, balance: a.balance })),
      categories: categoriesObj.map(c => ({ name: c.name, type: c.type })),
      monthlySalary: salary,
      budgets: budgets.map(b => ({ categoryName: b.categoryName, limit: b.limitAmount })),
      recentTransactions: transactions.slice(0, 15).map(t => ({
        title: t.title,
        amount: t.amount,
        type: t.type,
        category: t.category,
        account: t.accountId?.name || 'Unknown',
        date: t.date
      }))
    };

    // System prompt instructing the LLM to behave as a structured Function Calling / Intent agent
    const prompt = `You are the agentic core of "Nimbus Wallet", a smart financial planner.
Here is the user's current live database state:
${JSON.stringify(dbContext, null, 2)}

The user sent this message: "${message}"

Your task is to analyze the user's message and determine if they want to:
1. "CREATE_TRANSACTION": If the user is logging a transaction (e.g. spent money, received income, earned salary).
2. "SET_BUDGET": If the user wants to configure or update a category budget limit.
3. "GENERAL_QUERY": If they are asking about balances, spending summaries, advice, tips, or chatting.

You MUST respond strictly in the following JSON format:
{
  "intent": "CREATE_TRANSACTION" | "SET_BUDGET" | "GENERAL_QUERY",
  "transactionDetails": {
    "title": "String (short title)",
    "amount": number,
    "type": "debit" | "credit",
    "category": "String (must match one of the database categories)",
    "accountName": "String (closest match to existing account names)"
  },
  "budgetDetails": {
    "categoryName": "String (must match one of the database categories)",
    "limitAmount": number
  },
  "conversationalReply": "String (your friendly direct answer for general queries, or confirmation message for executed actions. Use markdown. Be concise.)"
}

Do NOT wrap the response in markdown blocks like \`\`\`json. Return raw JSON string only.`;

    const model = ai.getGenerativeModel(
      { model: 'gemini-1.5-flash' },
      { apiVersion: 'v1' }
    );
    const response = await model.generateContent(prompt);
    const resultText = response.response.text().trim();

    let parsed;
    try {
      parsed = JSON.parse(resultText);
    } catch (parseErr) {
      // Fallback if formatting was slightly off
      return res.json({ reply: resultText });
    }

    // Process Intents programmatically
    if (parsed.intent === 'CREATE_TRANSACTION' && parsed.transactionDetails) {
      const { title, amount, type, category, accountName } = parsed.transactionDetails;
      
      // Resolve Account
      let account = accounts.find(a => a.name.toLowerCase().includes(accountName.toLowerCase())) || accounts[0];
      if (!account) {
        return res.json({ reply: "I tried to add the transaction but couldn't locate any active accounts. Please create an account card first." });
      }

      // Create ledger record
      const newTx = new Transaction({
        title: title || 'Gemini AI Log',
        amount: parseFloat(amount) || 0,
        type: type || 'debit',
        category: category || (type === 'credit' ? 'Other Income' : 'Other Expenses'),
        accountId: account._id,
        date: new Date().toISOString().split('T')[0]
      });
      await newTx.save();

      // Adjust account balance
      account.balance += (type === 'credit') ? newTx.amount : -newTx.amount;
      await account.save();

      return res.json({
        reply: parsed.conversationalReply || `🤖 **Gemini Agent Action:** Logged **₹${newTx.amount}** for *"${newTx.title}"* (${newTx.category}) under **${account.name}**.`
      });
    }

    if (parsed.intent === 'SET_BUDGET' && parsed.budgetDetails) {
      const { categoryName, limitAmount } = parsed.budgetDetails;
      
      const budget = await Budget.findOneAndUpdate(
        { categoryName },
        { limitAmount: parseFloat(limitAmount) },
        { new: true, upsert: true }
      );

      return res.json({
        reply: parsed.conversationalReply || `🤖 **Gemini Agent Action:** Configured monthly budget limit for **${categoryName}** to **₹${limitAmount}**.`
      });
    }

    // Default to general conversation response generated by Gemini
    return res.json({ reply: parsed.conversationalReply });

  } catch (err) {
    console.error("Chatbot Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// --- TRANSACTION ROUTES ---

// Get all transactions
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('accountId', 'name type')
      .sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create transaction (Credit/Debit) with balance adjustments
router.post('/transactions', async (req, res) => {
  const { title, amount, type, category, accountId, date } = req.body;
  
  try {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account/Card not found' });
    }

    const newTx = new Transaction({
      title,
      amount: numericAmount,
      type,
      category,
      accountId,
      date
    });

    const savedTx = await newTx.save();

    if (type === 'credit') {
      account.balance += numericAmount;
    } else if (type === 'debit') {
      account.balance -= numericAmount;
    }
    await account.save();

    const populatedTx = await savedTx.populate('accountId', 'name type');
    res.status(201).json(populatedTx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update transaction (PUT) and reverse/re-apply balance impact
router.put('/transactions/:id', async (req, res) => {
  const { title, amount, type, category, accountId, date } = req.body;
  
  try {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const tx = await Transaction.findById(req.params.id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const oldAccount = await Account.findById(tx.accountId);
    if (oldAccount) {
      if (tx.type === 'credit') {
        oldAccount.balance -= tx.amount;
      } else if (tx.type === 'debit') {
        oldAccount.balance += tx.amount;
      }
      await oldAccount.save();
    }

    const newAccount = await Account.findById(accountId);
    if (!newAccount) {
      return res.status(404).json({ error: 'Selected account/card not found' });
    }

    if (type === 'credit') {
      newAccount.balance += numericAmount;
    } else if (type === 'debit') {
      newAccount.balance -= numericAmount;
    }
    await newAccount.save();

    tx.title = title;
    tx.amount = numericAmount;
    tx.type = type;
    tx.category = category;
    tx.accountId = accountId;
    tx.date = date;

    const saved = await tx.save();
    const populated = await saved.populate('accountId', 'name type');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete transaction (and reverse balance change)
router.delete('/transactions/:id', async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const account = await Account.findById(tx.accountId);
    if (account) {
      if (tx.type === 'credit') {
        account.balance -= tx.amount;
      } else if (tx.type === 'debit') {
        account.balance += tx.amount;
      }
      await account.save();
    }

    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted and balance adjusted', deletedId: tx._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- SALARY CONFIG ROUTES ---

// Get salary and credit date
router.get('/salary', async (req, res) => {
  try {
    let salaryObj = await Salary.findOne();
    if (!salaryObj) {
      salaryObj = new Salary({ amount: 5000, creditDate: '2026-07-01' });
      await salaryObj.save();
    }
    res.json({ salary: salaryObj.amount, creditDate: salaryObj.creditDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update salary and credit date
router.post('/salary', async (req, res) => {
  const { salary: newAmount, creditDate: newDate } = req.body;
  try {
    let salaryObj = await Salary.findOne();
    if (!salaryObj) {
      salaryObj = new Salary({ amount: newAmount, creditDate: newDate || '2026-07-01' });
    } else {
      if (newAmount !== undefined) salaryObj.amount = newAmount;
      if (newDate !== undefined) salaryObj.creditDate = newDate;
    }
    await salaryObj.save();
    res.json({ 
      message: 'Salary settings updated successfully', 
      salary: salaryObj.amount, 
      creditDate: salaryObj.creditDate 
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
