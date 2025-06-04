import React, { useState } from 'react'
import Button from './Button'
import "../styles/pre-trained-model-block.css"
import { useNavigate } from 'react-router-dom'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import defaultImage from '../assets/image.png'  

import ModlaHiddenInformation from './modal-hidden-information';

const PreTrainedModelBlock = ({
    modelName,
    modelDescription,
    id,
    modelCategory,
    modelCreatedAt,
    modelCreatedBy,
    modelCreatorEmail,
    featureImage
}) => {
    const navigate = useNavigate()
    const [show, setShow] = useState(false);
    const [imgError, setImgError] = useState(false);

    const handleInfoClick = (event) => {
        setShow(true);
    };

    const handleImageError = () => {
        setImgError(true);
    };

    return (
        <div className='block-container' style={{ position: 'relative' }}>
            <div className='model-img'>
                <img 
                    src={!imgError && featureImage ? featureImage : defaultImage}
                    alt={`${modelName} preview`}
                    onError={handleImageError}
                />
            </div>
            
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
            <Button type="button" className="btn btn-sm btn-primary" onClick={() => { navigate(`/classify/${id}`) }}> Use </Button>
        </div>
    )
}

export default PreTrainedModelBlock
