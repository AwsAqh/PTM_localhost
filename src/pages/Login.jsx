import React, { useRef, useState } from 'react'

import "../styles/login.css"
import Notification from '../components/Notification'
import { useNavigate } from 'react-router-dom'

const LoginPage = () => {
    const apiUrl = import.meta.env.VITE_API_BACKEND_URL
   
    const navigate=useNavigate()
    const [loading,setLoading]=useState(false)
const [error,setError]=useState("")    
const formEmail=useRef(null)
const formPassword=useRef(null)
const [notification,setNotification]=useState({show:false,message:'',type:'',actions:[]})
const handleFormSubmit=async(e)=>{  
    e.preventDefault()  
    
    
    if(!formPassword.current.value){  setNotification({ show:true, message:"Please fill all fileds !", type:"error",actions:[] })
        return
}





    let url =`${apiUrl}/api/auth/login`
    let body={
        email:formEmail.current.value,
        password:formPassword.current.value}
    
    try{    

          
            setLoading(true)
            const response=await fetch(url,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify(body)
            })
            setLoading(false)
          
            const data=await response.json()
      
            if(response.ok) {
                    localStorage.setItem("token",data.token)
                 
                    navigate("/home")
            }
            else (setNotification({message:data.msg,type:"error",actions:[],show:true})) 

    }
    catch(error){
        setLoading(false)
       
           setNotification({message:"something went wrong!",type:"error",show:true})
    }

}

const handleForgotClick=()=>{

    if(!formEmail.current.value){
         
    setNotification({ show:true, message:"Please fill all fileds !", type:"error",actions:[] })
        return
}

navigate('/reset-password',{state:{email:formEmail.current?.value}})

}

  return (
    <div className='auth-page'>

{notification.show&&<Notification message={notification.message} type={notification.type} actions={notification.actions} onClose={()=>setNotification({...notification,show:false})}  />}    

            
            <div className='auth-area'>
                    <div className='auth-header'>
                        
                        Welcome back
                    </div>


                    <div className='auth-form'> 

                    <form onSubmit={handleFormSubmit}>
                            <div className="mb-3">
                                
                                <input ref={formEmail} placeholder='Email' required={true} type="email" className="form-control" id="exampleInputEmail1" aria-describedby="emailHelp"/>
                                
                            </div>
                            <div className="mb-3">
                                
                                <input ref={formPassword}  placeholder="password" type="password" className="form-control" id="exampleInputPassword1"/>
                            </div>
                            <div style={{display:"flex",flexDirection:'column', gap:"10px"}}>
                            <button type="submit" className='login-btn' >{loading ? "Loading..." : "Login"}</button>

                            <button type='button' className='outlined-btn' onClick={handleForgotClick}  >Forgot password</button>
                            </div>

                            <div style={{fontSize:"12px", paddingTop:"5px"}}> Don't have an account? <a href='/register'>Register</a> </div>

                    </form>
                    
                      </div>

                     


                      
            </div>
    </div>
  )
}

export default LoginPage
