import React, { useState,useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/header'
import "../styles/BrowsePreTrainedModels.css"
import PreTrainedModelBlock from '../components/pre-trained-model-block'
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

const BrowsePreTrainedModels = () => {
  const navigate = useNavigate()
  const [models, setModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredModels, setFilteredModels] = useState([]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'plants', label: 'Plants' },
    { value: 'animals_diseases', label: 'Animals & Diseases' },
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
        console.log("token expired ! ")
        localStorage.removeItem('token')
        navigate('/login')
      }
    } catch(err) {
      console.log("failed to decode token ",err)
      localStorage.removeItem('token')
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    const handleOnMount = async() => {
      try {
        const response = await fetch("http://localhost:5000/api/classify/models", {
          method: "GET",
          headers: { "Content-type": "application/json" }
        })
        if(!response.ok) {
          console.log("error retrieving data ")
        }
        const data = await response.json()
        setModels(data)
        setFilteredModels(data)
      } catch {
        console.log("can't fetch models!")
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
      <div className='models-container'>
        {filteredModels.map((model, index) => 
          <PreTrainedModelBlock 
            key={index} 
            modelName={model.name} 
            modelDescription={model.modelDescription} 
            id={model._id} 
          />
        )}
      </div>
    </div>
  )
}

export default BrowsePreTrainedModels
