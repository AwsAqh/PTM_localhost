import React from 'react'
import "../styles/header.css"
import { useNavigate } from 'react-router-dom'
const Header = () => {
  const navigate=useNavigate()
  return (
    <div className='header'>
            <h2 onClick={()=>navigate("/home")}>PTM</h2>
    </div>
  )
}

export default Header
