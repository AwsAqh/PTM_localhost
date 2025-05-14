import React from 'react'
import Button from './Button'
import "../styles/pre-trained-model-block.css"
import { useNavigate } from 'react-router-dom'
const PreTrainedModelBlock = ({modelName,modelDescription,id}) => {
    const navigate=useNavigate()
  return (
    <div className='block-container'>
      <div className='model-img' ><img 
      src='https://res.cloudinary.com/dtcvwgftn/image/upload/v1746458359/classify/something%20types_caa9490d/1746458357893_download_%289%29.jpeg.jpg' /></div>
      <div className='model-info'>
            <div className='model-name'>{modelName}</div>
            <div className='model-desc'>{modelDescription}</div>
            <Button type="button"  className="btn btn-sm btn-primary" onClick={()=>{navigate(`/classify/${id}`)}} > Use </Button>
      </div>  
    </div>
  )
}

export default PreTrainedModelBlock
