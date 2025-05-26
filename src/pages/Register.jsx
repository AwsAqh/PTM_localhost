import React, { useRef, useState } from 'react'

import "../styles/login.css"

import { useNavigate } from 'react-router-dom'


const RegisterPage = () => {
    const apiUrl = import.meta.env.VITE_API_URL
    const navigate=useNavigate()
const [error,SetError]=useState("")
const name=useRef(null)    
const email=useRef(null)
const password=useRef(null)
const confirmPassword=useRef(null)

const handleFormSubmit=async(e)=>{  
    e.preventDefault()    
    console.log("email : ", email.current.value) 

            let url=`${apiUrl}/api/auth/register`
            let body={name:name.current.value,
                email:email.current.value,
                password:password.current.value}

                console.log(body)
    try{
            
            console.log("before fetch")
            console.log("body: ",body)
            const response= await fetch(url,{
                method:"POST",
                headers:{
                    'Content-Type':'application/json'
                },
                body:JSON.stringify(body)
            })
            console.log("after fetch")
            const data=await response.json()
            if(response.ok){
                localStorage.setItem("token",data.token)
                navigate("/login")
            }
            else {SetError(data.msg)}

    }catch(err){

        SetError("something went wrong" , err)
    }

}
    
    console.log(error)
  return (
    <div className='auth-page'>


            
            <div className='auth-area'>
                    <div className='auth-header'>
                     
                        Create an account
                    </div>


                    <div className='auth-form'> 

                    <form onSubmit={handleFormSubmit}>
                             <div class="mb-3">
                                
                                <input ref={name} placeholder='Name' type="text" class="form-control" id="name" aria-describedby="emailHelp"/>
                                
                            </div>
                            <div class="mb-3">
                                
                                <input ref={email} placeholder='Email' type="email" class="form-control" id="email" aria-describedby="emailHelp"/>
                                
                            </div>
                            <div class="mb-3">
                                
                                <input ref={password}  placeholder="password" type="password" class="form-control" id="pPassword"/>
                            </div>

                            <div class="mb-3">
                                
                                <input ref={confirmPassword}  placeholder="confirm password" type="password" class="form-control" id="confirm-password"/>
                            </div>
                           
                            <button type="submit" class="btn btn-primary">Register</button>
                            <div style={{fontSize:"12px", paddingTop:"5px"}}> already have an account? <a href='/login'>Login</a> </div>
                    </form>
                    
                      </div>

                      <div class="options-span">
                            <div class="line"></div>
                            <span class="text">Or Register With</span>
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

export default RegisterPage
