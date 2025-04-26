import React from 'react'
import Header from '../components/header'
import "../styles/classifyImage.css"
import Upload from "../assets/upload-image-for-classification.png"
import { useParams } from 'react-router-dom'
const ClassifyImage = () => {

  const {id}=useParams()
  console.log("model id : " , id)  
    const handleClassifyImage=async(file)=>{
      console.log("inside handleClassifyImage ")
      
      try{
          const formData=new FormData()
          formData.append("file",file)
          formData.append("modelId",id)
          
            const response =await fetch("http://localhost:5000/api/classify/classify",{
              method:"POST",
             
              body:formData
            })
          if(!response.ok) console.log("error uploading file")
            const data=await response.json()
            console.log("image classified : ")
      }
      catch{
        console.log("error classifyng image ")
      }

    }


    const handleFileChange=(file)=>{
      console.log("file : ", file)

    }


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
            name='file'
            className='img-input'
             type='file' 
             onChange={(e)=>handleClassifyImage(e.target.files[0])}
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
