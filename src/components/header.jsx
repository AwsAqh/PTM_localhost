import React from 'react'
import "../styles/header.css"
import { useNavigate } from 'react-router-dom'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
const Header = () => {
  const navigate=useNavigate()
  return (
    <div className='header'>
            <div className='ptm-title'><h2 onClick={()=>navigate("/home")}>PTM</h2></div>
            <div className='header-options'
             onClick={()=>{localStorage.removeItem("token") 
              navigate('/login')
            }}>
              <LogoutOutlinedIcon/>
              Log out
            </div>
    </div>
  )
}

export default Header
