const express=require("express")
const mongoose=require("mongoose")
const cors =require("cors")
const authRoutes=require ("./routes/authRoutes")
const classifyRoutes=require('./routes/classifyRoutes')
const port = process.env.PORT || 5050
const app=express()

app.use(cors());
app.use(express.json())


mongoose.connect("mongodb://localhost:27017/ptm-local").then(()=>{
    console.log("Database connected successfully!")
}).catch((err)=>{
    console.log("Database connection error:",err)
})

app.use("/api/auth", authRoutes)
app.use("/api/classify", classifyRoutes)

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.listen(port, () => {
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
