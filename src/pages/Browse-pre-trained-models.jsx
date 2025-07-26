import React, { useState,useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/header'
import "../styles/BrowsePreTrainedModels.css"
import PreTrainedModelBlock from '../components/pre-trained-model-block'
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import Notification from '../components/Notification'

const BrowsePreTrainedModels = () => {
  const apiUrl = import.meta.env.VITE_API_BACKEND_URL
  const navigate = useNavigate()
  const [models, setModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredModels, setFilteredModels] = useState([]);
  const [userName, setUserName] = useState('')
  const [error, setError] = useState(null)
  const {id} = useParams()
 
  useEffect(() => { 
    if(!id) navigate("/browse")
  }, [id, navigate])
  const [notification,setNotification]=useState({show:false,message:'',type:'',actions:[]})
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'plants', label: 'Plants' },
    { value: 'animals diseases', label: 'Animals  Diseases' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'other', label: 'Other' }
  ];

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

  useEffect(() => {
    const handleOnMount = async() => {
      try {
        if(id) {
          const response = await fetch(`${apiUrl}/api/classify/models/${id}`, {
            method: "GET",
            headers: { "Content-type": "application/json" }
        })
        const data = await response.json()
      
  
        if(!response.ok) {
    
          setNotification({message:data.msg,type:"error",show:false})
        }
        
        setModels(data.models || [])
        setFilteredModels(data.models || [])
        setUserName(data.userName)
      }
      else {
        const response = await fetch(`${apiUrl}/api/classify/models`, {
          method: "GET",
          headers: { "Content-type": "application/json" }
        })
        const data = await response.json()
        if(!response.ok) {
       
          setNotification({message:data.msg,type:"error",show:false})
        }
        
        setModels(data || [])
        setFilteredModels(data || [])
      }
    
    } catch (err) {
      
      setNotification({message:"something went wrong!",show:true,type:'error'})
      }
    }
    handleOnMount()
  }, [])

  useEffect(() => {
    const filtered = models.filter(model => {
      const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (model.modelDescription && model.modelDescription.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || model.modelCategory === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
    setFilteredModels(filtered);
  }, [searchQuery, selectedCategory, models]);

  return (
    <div className='models-page-container'>
      <Header/>
      {notification.show&&<Notification message={notification.message} type={notification.type} actions={notification.actions} onClose={()=>setNotification({...notification,show:false})}  />}    

      <div className='search-container'>
        <div className='search-filters'>
          <div className='search-box'>
            <SearchIcon className='search-icon' />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='search-input'
            />
          </div>
          <div className='category-filter'>
            <FilterListIcon className='filter-icon' />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className='category-select'
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div> 
      {id && !error && <div style={{fontSize:"20px",fontWeight:"bold",marginBottom:"20px", color:"#fff"}}>Models by {userName} </div>}
      {error && <div style={{fontSize:"20px",fontWeight:"bold",marginBottom:"20px", color:"#fff"}}>{error}</div>}
      {models.length === 0 && !error && <div>No models found.</div>}
      <div className='models-container'>
        {filteredModels.map((model, index) => 
          <PreTrainedModelBlock 
            key={index} 
            modelName={model.name} 
            modelDescription={model.modelDescription} 
            modelCategory={model.modelCategory}
            modelCreatedAt={model.createdAt}
            modelCreatedBy={model.creatorName}
            modelCreatorEmail={model.creatorEmail}
            featureImage={model.featureImage}
            id={model._id} 
          />
        )}
      </div>
    </div>
  )
}

export default BrowsePreTrainedModels
