import React, { useRef, useState } from 'react'
import Notification from '../components/Notification'
import "../styles/login.css"

import { useNavigate } from 'react-router-dom'


const RegisterPage = () => {
    const apiUrl = import.meta.env.VITE_API_BACKEND_URL
    const navigate=useNavigate()
const [error,SetError]=useState("")
const name=useRef(null)    
const email=useRef(null)
const password=useRef(null)
const confirmPassword=useRef(null)
const [loading,setLoading]=useState(false)
const [notification,setNotification]=useState({show:false,message:'',type:'',actions:[]})

const handleFormSubmit=async(e)=>{  
    e.preventDefault()    

    if(!email.current.value || !name.current.value || !password.current.value){
        setNotification({ show:true, message:"Please fill all fileds !", type:"error",actions:[] })
        return

    }
    if(password.current.value.length<6){setNotification({ show:true, message:"Password must be 6 characters length!", type:"error",actions:[] })
        return}
    if(confirmPassword.current.value!==password.current.value){setNotification({ show:true, message:"passwords must matched! !", type:"error",actions:[]  })
        return}

            let url=`${apiUrl}/api/auth/register`
            let body={name:name.current.value,
                email:email.current.value,
                password:password.current.value}

               
    try{
            
            setLoading(true)
            const response= await fetch(url,{
                method:"POST",
                headers:{
                    'Content-Type':'application/json'
                },
                body:JSON.stringify(body)
            })
            setLoading(false)
            const data=await response.json()
            if(response.ok){
                localStorage.setItem("token",data.token)
                navigate("/login")
            }
            else {SetError(data.msg)}

    }catch(err){

        setNotification({message:"something went wrong!",show:true,type:'error'})
    }

}
    
 
  return (
   
    <div className='auth-page'>
        {notification.show&&<Notification message={notification.message} type={notification.type} actions={notification.actions} onClose={()=>setNotification({...notification,show:false})}  />}    

            
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
                           
                            <button type="submit" className="login-btn">{loading? "Registering...":"Register"}</button>
                            <div style={{fontSize:"12px", paddingTop:"5px"}}> already have an account? <a href='/login'>Login</a> </div>
                    </form>
                    
                      </div>

                      
            </div>
    </div>
  )
}

export default RegisterPage
