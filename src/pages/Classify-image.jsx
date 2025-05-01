import {React,useEffect, useState} from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/header'
import "../styles/classifyImage.css"
import Upload from "../assets/upload-image-for-classification.png"
import { useParams } from 'react-router-dom'
const ClassifyImage = () => {
  const [classes,setClassses]=useState([])
  const [modelName,setModelName]=useState('')
  
  const {id}=useParams()

  const navigate=useNavigate()
  //secure page
  useEffect((  )=>{
    const token=localStorage.getItem("token")
    console.log(token)
    if(!token) navigate("/login")
      

  },[navigate])

  //load classes on mount
  useEffect(()=>{
      const getModelClasses=async()=>{
         try{
      const response=await fetch(`http://localhost:5000/api/classify/classes/${id}`,
        {method:'GET',
        headers:{'Content-type':'application/json'}})

        if(!response.ok) console.log("something went wrong! ")
          else{
            const data=await response.json()
            setClassses(data.classes)
            setModelName(data.modelName)
            
          }

    }
      catch(err){
        console.log(" error getting classes :" ,err)

      }
      
    }
    getModelClasses()
  },[])

  //send a req for classification
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
            console.log("image classified : ",data.result)
      }
      catch{
        console.log("error classifyng image ")
      }

    }


  return (
    <div className='classify-page-container'>
    <Header/>
    <div  style={{display: "flex", flexDirection:"column", height:"100%", width:"100%", alignItems:"center",justifyContent:"center",gap:"3%"  }} >

     <div className='model-information' >
        {modelName}

        <div className='classes-list'>
        {classes.map((classItem,index)=><div key={index} className='class-box'>{classItem}</div>)}
            
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
