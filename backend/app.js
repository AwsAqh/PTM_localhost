const express=require("express")
const mongoose=require("mongoose")
const cors =require("cors")
const authRoutes=require ("./routes/authRoutes")
const classifyRoutes=require('./routes/classifyRoutes')
const port=5000
const app=express()

app.use(cors({
    allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'],
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));
  

app.use(express.json())

mongoose.connect("mongodb://localhost:27017/ptm")
.then(()=>console.log("Database connected!"))
.catch(err=>console.log("databse connection error!!!!",err))



app.use("/api/auth", authRoutes)
app.use("/api/classify", classifyRoutes)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

