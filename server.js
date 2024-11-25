require('dotenv').config();
const express = require('express');
const http = require('http');
const session = require('express-session');
const passport = require('passport');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes'); // Import the user routes
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const categoryRoutes = require("./routes/category.routes");
const cors = require('cors');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware to parse JSON
app.use(express.json());

// **CORS Configuration**
const corsOptions = {
  origin: ['http://192.168.100.3:8081', 'http://localhost:8081'],// Replace with your frontend's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow these HTTP methods
  credentials: true, // Allow cookies and credentials to be sent
};
app.use(cors(corsOptions));

// **Add express-session middleware**
app.use(session({
    secret: 'your_secret_key', // Replace this with a strong secret
    resave: false,  // Avoid resaving session if nothing is changed
    saveUninitialized: false, // Do not create session until something is stored
}));

// Initialize Passport and use session
app.use(passport.initialize());
app.use(passport.session());  // This is what enables session-based authentication

// Connect to MongoDB
connectDB();

// Use the user routes
app.use('/api/v1', userRoutes); // Mount the user routes
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/orders", orderRoutes);

app.get('/', (req, res) => {
  res.send('Your are connected into backend.')
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  let userId = null; // Initialize userId

  socket.on('join', (id) => {
    userId = id; // Assign userId when the user joins
    updateUserStatus(userId, 'Online');
    io.emit('statusUpdate', { userId, status: 'Online' });
  });

  socket.on('disconnect', () => {
    if (userId) {
      updateUserStatus(userId, 'Offline');
      io.emit('statusUpdate', { userId, status: 'Offline' });
    }
    console.log('Client disconnected:', socket.id);
  });
});


const updateUserStatus = async (userId, status) => {
  try {
    await userDal.updateUserStatus(userId, status);
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

// Start the server
const PORT = process.env.PORT || 6001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://192.168.100.3:${PORT}`);
});
