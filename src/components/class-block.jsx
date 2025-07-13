import React, { useState } from 'react'
import "../styles/class-block.css"
import Button from './Button'
const ClassBlock = ({ onDelete, id,fileState, elref,onFileChange,classesCount,onReset }) => {

    const [fileName, setFileName] = useState("Upload")
    const [isValid, setIsValid] = useState(true); 

    const handleInputChange = (e) => {
      setIsValid(e.target.value.trim() !== "");  // Check if input is not empty
    };
  
    return (
      <div className={`class-block ${isValid ? '' : 'invalid'}`}>
        <div className='class-name'>
          <input required ref={elref} placeholder="Class name" type='text' onChange={handleInputChange}  />
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
           {fileState?.length!=0? fileState.length:"Upload" }
          </label>

          <Button   type="button" className="btn btn-secondary btn-sm" onClick={ onReset }>
            Reset
          </Button>
    
          <Button disabled={classesCount === 2}   type="button" className="btn btn-secondary btn-sm" onClick={() =>  onDelete() }>
            Delete
          </Button>
        </div>
      </div>
    );
  };

export default ClassBlock
