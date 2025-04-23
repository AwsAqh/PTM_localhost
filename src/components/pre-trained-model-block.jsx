import React from 'react'
import Button from './Button'
import "../styles/pre-trained-model-block.css"
import { useNavigate } from 'react-router-dom'
const PreTrainedModelBlock = ({modelName}) => {
    const navigate=useNavigate()
  return (
    <div className='block-container'>
      <div className='model-img' ><img src='https://res.cloudinary.com/dtcvwgftn/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1744545059/Cat%20vs%20dog/dog/1744545054415_download_%285%29.jpeg.jpg' /></div>
      <div className='model-info'>
            <div>{modelName}</div>
            <Button type="button"  className="btn btn-sm btn-primary" onClick={()=>{navigate("/classify")}} > Use </Button>
      </div>  
    </div>
  )
}

export default PreTrainedModelBlock
