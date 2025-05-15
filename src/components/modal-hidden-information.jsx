import React from 'react'
import "../styles/modal-hidden-information.css"

const ModlaHiddenInformation = (props) => {
  
  return (
    <div >
    
      <div className={`modal-content modal modal-dialog `}>
        <div className="modal-header">
          <h5 className="modal-title">{props.modelName}</h5>
          <button type="button" className="btn-close" onClick={props.onClose} aria-label="Close"></button>
        </div>
        <div className="modal-body">
          <p>{props.modelDescription}</p>
          <p>{props.modelCategory}</p>
          <p>{props.modelCreatedAt}</p>
          <p>{props.modelCreatedBy}</p>
          <p>{props.modelCreatorEmail}</p>
        </div>
      </div>
    </div>
  )
}   

export default ModlaHiddenInformation
