const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    let token;
    console.log("Verifying token...");

    if (req.headers["authorization"]) {
        
        token = req.headers["authorization"].split(" ")[1];  
    } else if (req.headers["x-auth-token"]) {
        
        token = req.headers["x-auth-token"];
    }

    if (!token) {
        console.log("No token provided");
        return res.status(401).json({ msg: "Unauthorized, no token provided" });
    }

    try {
        
        const decoded = jwt.verify(token, "a secret key");  
        console.log("Decoded token:", decoded);  
        
        req.user = decoded.userId;  
        next();  
    } catch (err) {
        console.log("Error verifying token:", err);
        return res.status(401).json({ msg: "Failed to verify token" });
    }
};
