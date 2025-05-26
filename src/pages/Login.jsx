import React, { useRef, useState } from 'react'

import "../styles/login.css"

import { useNavigate } from 'react-router-dom'

const LoginPage = () => {
    const apiUrl = import.meta.env.VITE_API_BACKEND_URL
    
    const navigate=useNavigate()
const [error,setError]=useState("")    
const formEmail=useRef(null)
const formPassword=useRef(null)

const handleFormSubmit=async(e)=>{  
    e.preventDefault()    
    console.log("email : ", formEmail.current.value) 

    let url =`${apiUrl}/api/auth/login`
    let body={
        email:formEmail.current.value,
        password:formPassword.current.value}
    
    try{


            const response=await fetch(url,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify(body)
            })
            const data=await response.json()
            console.log("data : ",data)
            if(response.ok) {
                    localStorage.setItem("token",data.token)
                    console.log("token")
                    navigate("/home")
            }
            else (setError(data.msg)) 

    }
    catch{
            setError("something went wrong")
    }

}

  return (
    <div className='auth-page'>


            
            <div className='auth-area'>
                    <div className='auth-header'>
                        
                        Welcome back
                    </div>


                    <div className='auth-form'> 

                    <form onSubmit={handleFormSubmit}>
                            <div class="mb-3">
                                
                                <input ref={formEmail} placeholder='Email' type="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp"/>
                                
                            </div>
                            <div class="mb-3">
                                
                                <input ref={formPassword}  placeholder="password" type="password" class="form-control" id="exampleInputPassword1"/>
                            </div>
                           
                            <button type="submit" class="btn btn-primary">Login</button>
                            <div style={{fontSize:"12px", paddingTop:"5px"}}> Don't have an account? <a href='/register'>Register</a> </div>
                    </form>
                    
                      </div>

                      <div class="options-span">
                            <div class="line"></div>
                            <span class="text">Or Login With</span>
                            <div class="line"></div>
                      </div>  


                      <div class="social-buttons">
                            <a href="#" class="social-button google">
                                <i class="fab fa-google"></i> Google
                            </a>
                            <a href="#" class="social-button facebook">
                                <i class="fab fa-facebook-f"></i> Facebook
                            </a>
                      </div>
            </div>
    </div>
  )
}

export default LoginPage
