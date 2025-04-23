import React, { useState } from 'react'
import "../styles/class-block.css"
import Button from './Button'
const ClassBlock = ({ onDelete, id, elref,fileState,setter,onFileChange }) => {

    const [fileName, setFileName] = useState("upload")
    

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      
      
      if (file) 
        setFileName(file.name); 
       else 
        setFileName('Upload'); 
      

      [...e.target.files].map(file => setter(prev => [...prev, file]));
 
    
    };
  
    return (
      <div className='class-block'>
        <div className='class-name'>
          <input  ref={elref} placeholder="Class name" type='text' />
        </div>
        
        <div className='class-options'>
          
          <input
            type="file"
            id={`fileUpload-${id}`}
            onChange={onFileChange}
            style={{ display: 'none' }} 
            multiple
          />
         
          <label htmlFor={`fileUpload-${id}`} className="btn btn-primary btn-sm">
            {fileName} 
          </label>
  
    
          <Button type="button" className="btn btn-secondary btn-sm" onClick={() => { onDelete(id); }}>
            Delete
          </Button>
        </div>
      </div>
    );
  };

export default ClassBlock
