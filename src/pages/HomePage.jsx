import React, { useEffect } from 'react'
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import Header from '../components/header';
import "../styles/home-page.css"
import { useNavigate } from 'react-router-dom';
const HomePage = () => {
  const navigate=useNavigate()

  useEffect((  )=>{
    const token=localStorage.getItem("token")
    console.log(token)
    if(!token) navigate("/login")


  },[navigate])

  return (
    <div className='full-page-container'>
        <Header/>
        <div className='main-page-container'>
            <div onClick={()=> navigate("/browse")} className='user-option'>
                <SearchIcon/>
                Browse trained models
            </div>

            <div onClick={()=>navigate("/new")} className='user-option'>
                <AddIcon/>
                Train new model
            </div>
            
        </div>
    </div>
  )
 
}

export default HomePage
