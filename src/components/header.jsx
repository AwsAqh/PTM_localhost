import React from 'react'
import "../styles/header.css"
import { useNavigate } from 'react-router-dom'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
const Header = () => {
  const navigate=useNavigate()
  return (
    <div className='header'>
            <div className='ptm-title'><h2 onClick={()=>navigate("/home")}>PTM</h2></div>
            <div className='header-options'>

              <div class="btn-group">
                    <button class="btn btn-secondary btn-lg dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                      
                    </button>
                    <ul class="dropdown-menu">
                    My models
                    <div    onClick={()=>
                    {localStorage.removeItem("token") 
                    navigate('/login') }}>
                    <LogoutOutlinedIcon/> Log out

                     </div>
                    </ul>
              </div>
              
             
            </div>
    </div>
  )
}

export default Header
