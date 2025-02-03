require("dotenv").config();
const express = require("express");
const http = require("http");
const session = require("express-session");
const passport = require("passport");
const socketIo = require("socket.io");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes"); // Import the user routes
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const categoryRoutes = require("./routes/category.routes");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const cartRoutes = require("./routes/cart.routes");
const menuOptionRoutes = require("./routes/menuOption.routes");
const paymentMethodRoutes = require("./routes/paymentMethod.routes");

// Middleware to parse JSON
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Adjust CORS options
const corsOptions = {
  origin: [
    "https://www.api.ridedelicious.com", // Your production backend domain
    "https://ridedelicious.com",        // Your production frontend domain
    "http://localhost:8081",            // React Native Metro bundler (for development purposes)
  ],
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
  credentials: true, // Allow cookies/credentials if necessary
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  console.log("CORS Request:", req.headers.origin);
  next();
});

// **Add express-session middleware**
app.use(
  session({
    secret: "your_secret_key", // Replace this with a strong secret
    resave: false, // Avoid resaving session if nothing is changed
    saveUninitialized: false, // Do not create session until something is stored
  })
);

// Initialize Passport and use session
app.use(passport.initialize());
app.use(passport.session()); // This is what enables session-based authentication

// Connect to MongoDB
connectDB();

// Use the user routes
app.use("/api/v1", userRoutes); // Mount the user routes
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/menu-options", menuOptionRoutes);
app.use("/api/v1/payment-methods", paymentMethodRoutes);

app.get("/", (req, res) => {
  res.send("Your are connected into backend.");
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join", (orderId) => {
    console.log(`Client joined order room: ${orderId}`);
    socket.join(orderId);
  });

  socket.on("updateRiderLocation", ({ orderId, location }) => {
    console.log(`Rider location updated for order ${orderId}:`, location);
    io.to(orderId).emit("riderLocationUpdate", location);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

// Start the server
const PORT = process.env.PORT || 6001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
