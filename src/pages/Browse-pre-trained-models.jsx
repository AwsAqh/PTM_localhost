import React, { useState,useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/header'
import "../styles/BrowsePreTrainedModels.css"
import PreTrainedModelBlock from '../components/pre-trained-model-block'
const BrowsePreTrainedModels = () => {

  const navigate=useNavigate()
  useEffect((  )=>{
    const token=localStorage.getItem("token")
    console.log(token)
    if(!token) navigate("/login")
      try{
    const decodedToken=jwt_decode(token)
    const now= Date.now()/1000
    if(decodedToken.exp<now){
      console.log("token expired ! ")
      localStorage.removeItem('token')
      navigate('/login')
    }

    }
    catch(err){
      console.log("failed to decode token ",err)
      localStorage.removeItem('token')
      navigate('/login')
    }


  },[navigate])

       const [models,setModels] =useState([]);
        console.log(" type of models : ",models)

    useEffect(()=>{
        const handleOnMount=async()=>{
        try{
        const response=await fetch("http://localhost:5000/api/classify/models",{
            method:"GET",
            headers:{ "Content-type":"application/json" }
        })
        if(!response.ok){
                console.log("error retreiving data ")
        }
            const data=await response.json()
            setModels(data)

        }catch{
                    console.log("can't fetch models!")
        }}
        handleOnMount()
        },[])
       

  return (
    <div className='models-page-container'>
      <Header/>
        <div className='models-container'>

        {models.map((model,index)=> <PreTrainedModelBlock key={index} modelName={model.name} id={model._id}  />)}
                
                
        </div>
    </div>
  )
}

export default BrowsePreTrainedModels
