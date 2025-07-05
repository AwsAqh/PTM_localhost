const express=require("express")
const router=express.Router()
const {login,register,forgotPassword,confirmPin,resetPassword, checkEmailExists} =require("../controllers/authController")



router.post("/register",register)
router.post('/login',login)
router.post("/check-email-exists",checkEmailExists)
router.post('/forgot-password',forgotPassword)
router.post('/reset-password',resetPassword)
router.post('/confirm-pin',confirmPin)
module.exports = router;