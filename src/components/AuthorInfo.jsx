import React from 'react'
import Person2Icon from '@mui/icons-material/Person2';
import "../styles/AuthorInfo.css"
import Button from './Button';
import { useNavigate } from 'react-router-dom';
const AuthorInfo = ({createdBy, authorEmail, authorName}) => {
  const navigate=useNavigate()
  return (
    <div className="model-creator-area">
         <div className='container'>
              <div className='user-info'>
                <div style={{fontSize:"20px",fontWeight:"bold",color:"#999"}}> Author</div>
                <div className='svg'>  <Person2Icon/></div>
                <h2> {authorName}</h2>
                <h7> {authorEmail}</h7>
                <div className='about-user'> this is about, this is about, this is about, this is about,this is about, this is about. </div>
                <Button className="btn btn-secondary btn-sm" type="button" >Contact</Button>
                </div>

                <ul>
                    <li onClick={()=>navigate(`/browse/${createdBy}`)}>View all models</li>
                    <li>Browse Dataset</li>
                    <li>Other otion</li>
                   
                </ul>
         </div>
      </div>
  )
}

export default AuthorInfo
