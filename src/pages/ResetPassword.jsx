import React, { useEffect, useRef, useState } from 'react'
import "../styles/reset-password.css"
import Header from '../components/header'
import Notification from '../components/Notification'
import { useLocation,useNavigate } from 'react-router-dom'
import { Password } from '@mui/icons-material'
const ResetPassword = (route) => {

    const navigate=useNavigate()
    const [notification,setNotification]=useState({show:false,message:'',type:'',actions:[]})
    const {state}=useLocation()
    

    const digitOne=useRef("")
    const digitTwo=useRef("")
    const digitThree=useRef("")
    const digitFour=useRef("")
    const digitFive=useRef("")
    const digitSix=useRef("")
    
    const passwordRef=useRef(null)
    const confirmPasswordRef=useRef(null)

    const digitIndecies={
        0:digitOne,
        1:digitTwo,
        2:digitThree,
        3:digitFour,
        4:digitFive,
        5:digitSix
    }

    const [isPinCorrect,setisPinCorrect]=useState(false)
    const [allFilled, setAllFilled] = useState(false);

    // 2) helper to re-check them
    function checkAllFilled() {
      const filled = Object.values(digitIndecies).every(
        (r) => r.current?.value !== ""
      );
      setAllFilled(filled);
    }


    useEffect(()=>{
        
        const sendPin=async()=>{
        try{
          
            const response=await fetch("http://localhost:5050/api/auth/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:state.email})})
            const data=await response.json()
            
            if(!response.ok)
                setNotification({message:data.message,type:"error",show:true})

            else setNotification({message:data.message,type:"success",show:true})
        }catch{}
    }
    sendPin()
    },[])


    
    useEffect(()=>{
      
        digitIndecies[0]?.current?.focus()

         

    },[])

    useEffect(checkAllFilled,
        [
            digitFive.current?.value,digitSix.current?.value,
            digitOne.current?.value,
            digitTwo.current?.value,digitSix.current?.value
        ])

    const handlePinChange=(e)=>{
        e.target.blur()
        checkAllFilled()
        if(e.target.value ){
            for(let i=Number(e.target.id) ; i<6;i++){
            
            if(digitIndecies[i+1]?.current?.value===""){
            digitIndecies[i+1]?.current?.focus()
            
            return}
            }
        }
     
       
    }

  
    const handleKeyDown = (e) => {
        if (e.key !== 'Backspace') return;
    
        e.preventDefault();
        const idx = Number(e.target.id);
        const curr = digitIndecies[idx].current;
    
        if (curr.value) {
         
          curr.value = '';
        } else if (idx > 0) {
        
          const prev = digitIndecies[idx - 1].current;
          prev.value = '';
          prev.focus();
        }
    
      };


      const handleConfirmPin=async()=>{
             checkAllFilled()
        if(!allFilled){
            setNotification({ show:true, message:"Please fill all digits !", type:"error",actions:[] })
            return
        }
        
        try{
           
            const pin=digitOne.current.value+digitTwo.current.value+digitThree.current.value+digitFour.current.value+digitFive.current.value+digitSix.current.value
    
            const response=await fetch("http://localhost:5050/api/auth/confirm-pin",{method:"POST",headers:{"Content-Type":"application/json"}, body:JSON.stringify({email:state.email,pin})})
            const data=await response.json()
          
            if(!response.ok){
                setNotification({message:data.message,show:true,type:'error'})

            } 
       
            else setisPinCorrect(true)

        }catch (err){
            setNotification({message:"something went wrong!",show:true,type:'error'})

        }

      }

      const handleConfirmResetPassword=async(e)=>{
        e.preventDefault()
        if(passwordRef.current.value.length<6){
        setNotification({ show:true, message:"Password must be 6 characters length at least!", type:"error",actions:[] })
        return
        }
        if(passwordRef.current.value!==confirmPasswordRef.current.value)
        {
            setNotification({ show:true, message:"Passwords must match", type:"error",actions:[] })
        return

        }

        try{
           
            const pin=digitOne.current.value+digitTwo.current.value+digitThree.current.value+digitFour.current.value+digitFive.current.value+digitSix.current.value
           
                const response=await fetch("http://localhost:5050/api/auth/reset-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:state.email,pin,password:passwordRef.current.value})})
          
            const data=await response.json()
           
            if(!response.ok){
                setNotification({message:data.message,type:"error",show:true})
                return
            }
            setNotification({message:data.message,type:"sucess",show:true})
            setTimeout(()=> navigate("/login") ,3000)

        }catch(err){
            setNotification({message:"something went wrong!",show:true,type:"error"})

        }


      }


  return (
    <div className='auth-page'>
    <Header/>
    {notification.show&&<Notification message={notification.message} type={notification.type} actions={notification.actions} onClose={()=>setNotification({...notification,show:false})}  />}    

        <div className='reset-area'>

                <div className='pin-area flex-lyt'>
                    <span>Please enter the pin recived to email@example.com</span>
                    <div className='pin-validation flex-lyt'>
                        <input ref={digitOne} id='0' className='pin-digit-input' type='number' onChange={handlePinChange}  onKeyDown={handleKeyDown} />
                        <input ref={digitTwo}  id='1'className='pin-digit-input' type='number' onChange={handlePinChange} onKeyDown={handleKeyDown}/>
                        <input ref={digitThree} id='2'className='pin-digit-input' type='number' onChange={handlePinChange} onKeyDown={handleKeyDown}/>
                        <input ref={digitFour} id='3'className='pin-digit-input' type='number' onChange={handlePinChange} onKeyDown={handleKeyDown}/>
                        <input ref={digitFive} id='4'className='pin-digit-input' type='number' onChange={handlePinChange} onKeyDown={handleKeyDown}/>
                        <input ref={digitSix} id='5'className='pin-digit-input' type='number' onChange={handlePinChange} onKeyDown={handleKeyDown}/>
                    </div>
                    <button disabled={isPinCorrect}  onClick={  handleConfirmPin}   className={
                    allFilled && !isPinCorrect?"confirm-btn":"disabled-confirm-btn"
                     } >Confirm</button>

                </div>

                <div className='password-area flex-lyt'>
                <form className='flex-lyt'>
                    <div>
                    <label htmlFor="password" className={isPinCorrect? "label":"disabled-label"} > New password</label>
                    <input ref={passwordRef} disabled={!isPinCorrect} name="password"className="password-input" type="password"  />
                    </div>

                    <div>
                    <label htmlFor="confirm-password" className={isPinCorrect? "label":"disabled-label"} > Confirm password</label>
                    <input  ref={confirmPasswordRef} disabled={!isPinCorrect}  name="confirm-password"className="password-input" type="password"  />
                    </div>

                    <button disabled={!isPinCorrect}  type="submit" className={ isPinCorrect? 'confirm-btn':'disabled-confirm-btn' } onClick={handleConfirmResetPassword} >Confirm</button>
                </form>
                </div>

        </div>
      
    </div>
  )
}

export default ResetPassword
