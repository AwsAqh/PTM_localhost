import React, { useState, useEffect, useRef } from 'react'
import Button from './Button'
import "../styles/pre-trained-model-block.css"
import { useNavigate } from 'react-router-dom'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import ModlaHiddenInformation from './modal-hidden-information';
const PreTrainedModelBlock = ({modelName,modelDescription,id,modelCategory,modelCreatedAt,modelCreatedBy,modelCreatorEmail,}) => {
    const navigate=useNavigate()
    
    const [show, setShow] = useState(false);
    

    const handleInfoClick = (event) => {
        
        
        setShow(true);
    };

    return (
        <div className='block-container'style={{ position: 'relative' }}>
            <div className='model-img'><img 
                src='https://res.cloudinary.com/dtcvwgftn/image/upload/v1746458359/classify/something%20types_caa9490d/1746458357893_download_%289%29.jpeg.jpg' /></div>
            <div className='model-info'>
                <div className='model-name'>
                    {modelName}
                    <InfoOutlinedIcon onClick={handleInfoClick} style={{ cursor: 'pointer' }} />
                </div>
                {show && (
                    <ModlaHiddenInformation
                      
                        modelName={modelName}
                        modelCreatedBy={modelCreatedBy}
                        modelDescription={modelDescription}
                        modelCategory={modelCategory}
                        modelCreatedAt={modelCreatedAt}
                        modelCreatorEmail={modelCreatorEmail}
                        onClose={() => setShow(false)}
                    />
                )}
                <div className='model-desc'>{modelDescription}</div>
                <div className='model-category'>{modelCategory}</div>
                <Button type="button"  className="btn btn-sm btn-primary" onClick={()=>{navigate(`/classify/${id}`)}} > Use </Button>
            </div>  
        </div>
    )
}

export default PreTrainedModelBlock
