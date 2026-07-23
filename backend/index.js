const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nimbus-wallet';

console.log('Connecting to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB Database.'))
  .catch(err => {
    console.error('MongoDB database connection failed:', err.message);
    console.log('Please ensure MongoDB is running locally or specify a valid MONGO_URI in .env file.');
  });

// API Routes
app.use('/api', require('./routes/expenses'));

// Serve Frontend in Production mode (if compiled)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Nimbus Wallet API server is active and running.');
  });
}

app.listen(PORT, () => {
  console.log(`Server launched successfully. Listening at http://localhost:${PORT}`);
});
