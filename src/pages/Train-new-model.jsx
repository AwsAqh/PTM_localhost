import React, { useRef, useState,useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import "../styles/train-new-modle.css"
import Button from '../components/Button'
import ClassBlock from '../components/class-block'
import Header from '../components/header'
import Notification from '../components/Notification'
import axios from 'axios';



const TrainNewModel = () => {
  const apiUrl = import.meta.env.VITE_API_URL
  const navigate=useNavigate()
  const [notification, setNotification] = useState({ 
    show: false,
    message: '',
    type: '',
    actions: []
  });
  const [userId,setUserId]=useState(null) 
  //secure the page
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
     
      const decodedToken = jwt_decode(token);
      const currentTime = Date.now() / 1000; 
      setUserId(decodedToken.userId)
      
      if (decodedToken.exp < currentTime) {
        console.log("Token has expired.");
        localStorage.removeItem("token"); 
        navigate("/login"); 
      }
    } catch (error) {
      console.log("Error decoding token", error);
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  // Add effect for auto-hiding notification
  useEffect(() => {
    let timer;
    if (notification.show && notification.type !== 'loading') {
      timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [notification.show, notification.type]);


        const [classes,setClasses]=useState([{id:1, name:"class 1"} , {id:2, name:"class 2"} ])
        const modelName=useRef()
        const modelDescription=useRef()
        const modelArch=useRef()
        const modelCategory=useRef()
        const clsRefs=useRef(classes.map(item=>React.createRef()))
        const [filesState, setFilesState] = useState(classes.map(() => [])); 

        


        const handleAddClass = () => {
            const newClassId = classes.length + 1;
            const newClassName = `class ${newClassId}`;
        
            setClasses((prevClasses) => {
              const newClasses = [...prevClasses, { id: newClassId, name: newClassName }];
              // Ensure that refs are in sync with classes array
              clsRefs.current = newClasses.map(() => React.createRef()); // Update refs dynamically
              return newClasses;
            });
          };
        
          
          const handleDeleteClass = (id) => {
            setClasses((prevClasses) => {
              const newClasses = prevClasses.filter(classItem => classItem.id !== id);
              // Update refs to match the new classes list
              clsRefs.current = newClasses.map(() => React.createRef()); // Remove ref for deleted class
              setFilesState((prevFilesState) => prevFilesState.filter((_, index) => prevClasses[index].id !== id));
              return newClasses;
            });
          };


        const handleFileChange = (files, index) => {
            setFilesState((prevFilesState) => {
              const updatedFilesState = [...prevFilesState];
              updatedFilesState[index] = files; // Update the files for the specific class
              return updatedFilesState;
            });
          };
        
       
        const handleValidation=()=>{
          const emptyOnes=clsRefs.current.filter(ref=>ref.current.value.trim()==="")
          
          if (!modelName.current.value.trim()) {
            setNotification({
              show: true,
              message: 'Please enter a model name',
              type: 'error'
            });
            return;
          }
          
          if (emptyOnes.length > 0) {
            setNotification({
              show: true,
              message: 'Please fill in all class names',
              type: 'error'
            });
            return;
          }

          if (modelArch.current.value === 'default' || modelCategory.current.value === 'default') {
            setNotification({
              show: true,
              message: 'Please select both architecture and category',
              type: 'error'
            });
            return;
          }

          // Check if files are uploaded for all classes
          const emptyFiles = filesState.some(files => !files || files.length === 0);
          if (emptyFiles) {
            setNotification({
              show: true,
              message: 'Please upload files for all classes',
              type: 'error'
            });
            return;
          }

          handleSubmit();
        }
       

          const handleSubmit = () => {
            console.log("the ref for category if it's not selected : ",modelCategory.current.value)
            const names = clsRefs.current.map(ref => ref.current ? ref.current.value : null);
            console.log("inside train new model , , ", localStorage.getItem("token"))
            const formData = new FormData();
            formData.append("modelName", modelName.current.value);  
            formData.append("modelDescription", modelDescription.current.value)
            formData.append("classesCount", classes.length); 
            formData.append("modelArch",modelArch.current.value)
            formData.append("category",modelCategory.current.value)
            formData.append("userId",userId)  
            
            
           
            classes.forEach((classItem, index) => {
              formData.append(`class_name_${index}`, names[index]); // Add class name dynamically
              const dataset = filesState[index];
              if (dataset instanceof FileList) {
                Array.from(dataset).forEach(file => {
                  formData.append(`class_dataset_${index}`, file);  // Append each file under a unique key
                });
              }
            });

            // Show loading notification
            setNotification({
              show: true,
              message: 'Training model...',
              type: 'loading',
              actions: []
            });
          
            axios.post(`${apiUrl}/api/classify/train`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data', 
                "x-auth-token":localStorage.getItem("token")
              }
            })
              .then((response) => {
                console.log('Files uploaded:', response.data);
                setNotification({
                  show: true,
                  message: 'Model trained successfully!',
                  type: 'success',
                  actions: [
                    {
                      label: 'Use',
                      type: 'primary',
                      onClick: () => navigate(`/classify/${response.data.modelId}`)
                    },
                    {
                      label: 'OK',
                      onClick: () => setNotification(prev => ({ ...prev, show: false }))
                    }
                  ]
                });
              })
              .catch((error) => {
                console.error('Error uploading files:', error);
                setNotification({
                  show: true,
                  message: 'Error training model. Please try again.',
                  type: 'error'
                });
              });
          };
          
          
          
          
          
          
          
    return (
    <div className='full-page-container'>
        <Header/>
        {notification.show && (
          <Notification
            message={notification.message}
            type={notification.type}
            actions={notification.actions}
            onClose={() => setNotification(prev => ({ ...prev, show: false }))}
          />
        )}
            <div className='newModel-container' >
                    
                    <div className='head'>
                    <input required type="text" ref={modelName} placeholder='Model name' class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp"/>
                    <textarea required type="text" ref={modelDescription} placeholder='Model description' class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp"/>
                    <div className='arch-ctg-info'>
                          <select className='form-select' ref={modelArch} onChange={()=>console.log(modelArch.current.value)}>
                              <option value="default" disabled selected>Architecture</option>
                              <option value="resnet50">ResNet50</option>
                              <option value="googlenet">Googlenet</option>
                              <option value="mobilenet_v2">Mobilenet_v2</option>
                              
                          </select>

                          <select className='form-select' ref={modelCategory}>
                          <option value="default" disabled selected>Category</option>
                          <option value="plants">Plants</option>
                          <option value="animals_diseases">Animals diseases</option>
                          <option value="entertainment">Entertainment</option>
                          <option value="other">Other</option>
                          
                          </select>
                    </div>
                    </div>

                    <div className='classes-list'>
                                
                         {
                          classes.map((classItems,index) =>
                           <ClassBlock
                            elref={clsRefs.current[index]}
                            fileState={filesState[index]}
                            setter={setFilesState}
                            onFileChange={(e) => handleFileChange(e.target.files, index)}
                            onDelete={handleDeleteClass}
                             key={classItems.id}
                              id={classItems.id}
                              classesCount={classes.length} />)}
                                
                    </div>




                    <div className='user-options'>

                            <Button type="button" className="btn btn-primary" onClick={handleValidation} > Train </Button>

                            <Button  type="button" className="btn btn-secondary" onClick={handleAddClass} >Add class</Button>

                    </div>

                
            </div>
    </div>
  )
}

export default TrainNewModel
