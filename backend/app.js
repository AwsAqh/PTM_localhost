const express=require("express")
const mongoose=require("mongoose")
const cors =require("cors")
const authRoutes=require ("./routes/authRoutes")
const classifyRoutes=require('./routes/classifyRoutes')
const port = process.env.PORT || 5050
const app=express()

app.use(cors());
app.use(express.json())

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
};

// Connect to MongoDB with options
mongoose.connect(process.env.MONGO_URI, mongooseOptions)
  .then(() => {
    console.log("Database connected successfully!");
    // Log connection status
    console.log("MongoDB connection state:", mongoose.connection.readyState);
  })
  .catch(err => {
    console.error("Database connection error:", err);
    // Exit process with failure
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB disconnection:', err);
    process.exit(1);
  }
});

app.use("/api/auth", authRoutes)
app.use("/api/classify", classifyRoutes)

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.listen(port, '0.0.0.0', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let addresses = [];
    for (let iface in interfaces) {
        for (let i = 0; i < interfaces[iface].length; i++) {
            const address = interfaces[iface][i];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    console.log('Server running on:');
    console.log(`  Local:   http://localhost:${port}`);
    addresses.forEach(addr => {
        console.log(`  Network: http://${addr}:${port}`);
    });
});
