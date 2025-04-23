
import {  BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import './App.css'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import HomePage from './pages/HomePage'
import TrainNewModel from './pages/Train-new-model'
import BrowsePreTrainedModels from './pages/Browse-pre-trained-models'
import ClassifyImage from './pages/Classify-image'

function App() {
  

  return ( 
   <Router>
      <Routes>
          <Route path='/' element={<Navigate to="/login"/>} />
          <Route path='/login' element={<LoginPage/>} />
          <Route path='/register' element={<RegisterPage/>} />
          <Route path='/home' element={<HomePage/>} />
          <Route path='/new' element={<TrainNewModel/>}/>
          <Route path="/browse" element={<BrowsePreTrainedModels/>}/>
          <Route path="/classify" element={<ClassifyImage/>}/>
      </Routes>
   </Router>
  )
}

export default App
