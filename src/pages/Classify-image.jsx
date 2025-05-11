import {React, useEffect, useState} from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/header'
import "../styles/classifyImage.css"
import Upload from "../assets/upload-image-for-classification.png"
import { useParams } from 'react-router-dom'
import Notification from '../components/Notification'

const ClassifyImage = () => {
  const [classes, setClasses] = useState([])
  const [modelName, setModelName] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [classificationResult, setClassificationResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  
  const {id} = useParams()
  const navigate = useNavigate()

  //secure page
  useEffect(() => {
    const token = localStorage.getItem("token")
    if(!token) navigate("/login")
    try {
      const decodedToken = jwt_decode(token)
      const now = Date.now()/1000
      if(decodedToken.exp < now) {
        localStorage.removeItem('token')
        navigate('/login')
      }
    } catch(err) {
      localStorage.removeItem('token')
      navigate('/login')
    }
  }, [navigate])

  //load classes on mount
  useEffect(() => {
    const getModelClasses = async() => {
      try {
        const response = await fetch(`http://localhost:5000/api/classify/classes/${id}`,
          {
            method: 'GET',
            headers: {'Content-type': 'application/json'}
          })

        if(!response.ok) {
          setNotification({
            show: true,
            message: 'Error loading model information',
            type: 'error'
          })
        } else {
          const data = await response.json()
          setClasses(data.classes)
          setModelName(data.modelName)
        }
      } catch(err) {
        setNotification({
          show: true,
          message: 'Error loading model information',
          type: 'error'
        })
      }
    }
    getModelClasses()
  }, [id])

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setSelectedImage(URL.createObjectURL(file))
      setClassificationResult(null)
    }
  }

  const handleClassifyImage = async(file) => {
    if (!file) {
      setNotification({
        show: true,
        message: 'Please select an image first',
        type: 'error'
      })
      return
    }

    setIsLoading(true)
    setNotification({
      show: true,
      message: 'Classifying image...',
      type: 'loading'
    })
    
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("modelId", id)

      const response = await fetch("http://localhost:5000/api/classify/classify", {
        method: "POST",
        body: formData
      })

      if(!response.ok) {
        throw new Error('Classification failed')
      }

      const data = await response.json()
      setClassificationResult(data.result)
      setNotification({
        show: true,
        message: 'Classification complete!',
        type: 'success'
      })
    } catch(err) {
      setNotification({
        show: true,
        message: 'Error classifying image',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='classify-page-container'>
      <Header/>
      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(prev => ({ ...prev, show: false }))}
        />
      )}
      
      <div className='classify-content'>
        <div className='model-information'>
    
         
          <span>{modelName}</span>
          <div className='classes-list'>
            {classes.map((classItem, index) => (
              <div key={index} className={`class-box`}>
                {classItem}
              </div>
            ))}
          </div>
        </div>

        <div className='classify-area'>
          <div className='classify-block'>
            {selectedImage ? (
              <div className='selected-image-container'>
                <img src={selectedImage} alt="Selected" className='selected-image' />
                <button 
                  className='classify-button'
                  onClick={() => handleClassifyImage(selectedFile)}
                  disabled={isLoading || !selectedFile}
                >
                  {isLoading ? 'Classifying...' : 'Classify Image'}
                </button>
              </div>
            ) : (
              <>
                <img src={Upload} alt="Upload" />
                <p>Capture an image!</p>
                <input
                  name='file'
                  className='img-input'
                  type='file'
                  onChange={handleImageSelect}
                  style={{display: "none"}}
                  id="input-image"
                  accept="image/*"
                />
                <label className='upload-label' htmlFor='input-image'>
                  Upload Image
                </label>
              </>
            )}
          </div>
        </div>

       
      </div>
    </div>
  )
}

export default ClassifyImage
