import React from 'react'
import Header from '../components/header'
import "../styles/classifyImage.css"
import Upload from "../assets/upload-image-for-classification.png"
const ClassifyImage = () => {
  return (
    <div className='classify-page-container'>
    <Header/>
    <div  style={{display: "flex", flexDirection:"column", height:"100%", width:"100%", alignItems:"center",justifyContent:"center",gap:"3%"  }} >

     <div className='model-information' >
        Model Name

        <div className='classes-list'>
            <div className='class-box'> class 1 </div>
            <div className='class-box'> class 2 </div>
            <div className='class-box'> class 3 </div>
        </div>
     </div>


       <div style={{height:"70%",width:"70%", display: "flex",alignItems:"center",justifyContent:"center", backgroundColor:"rgb(206, 206, 206)",borderRadius:"10px" }}>
        <div className='classify-block'>
            <img src={Upload} />
            Capture an image !
           
            <input
            className='img-input'
             type='file' 
            style={{display:"none"}}
            id="input-image"
            />
            <label className='label' htmlFor='input-image' > Upload </label>
            </div> 
        </div>
    </div>
      
    </div>
  )
}

export default ClassifyImage
