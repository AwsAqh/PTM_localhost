import React, { useRef, useState,useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import "../styles/train-new-modle.css"
import Button from '../components/Button'
import ClassBlock from '../components/class-block'
import Header from '../components/header'
import Notification from '../components/Notification'
import axios from 'axios';
import jwt_decode from 'jwt-decode';


const TrainNewModel = () => {
  const apiUrl = import.meta.env.VITE_API_BACKEND_URL
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
            
            // Add ref immediately
            clsRefs.current.push(React.createRef());
            
            setClasses((prevClasses) => {
              return [...prevClasses, { id: newClassId, name: newClassName }];
            });
            
            // Add empty files array for the new class
            setFilesState((prevFilesState) => {
              return [...prevFilesState, []];
            });
            
          };
        
          const handleResetClassFiles=(index)=>{
            setFilesState(prevState=>{
              const current=[...prevState]
              current[index]=[]
              return current


            })

          }
          const handleDeleteClass = (idx) => {
            // Update refs immediately before state changes
            clsRefs.current = clsRefs.current.filter((_, index) => index !== idx);
            
            // First remove the class
            setClasses((prevClasses) => {
              return prevClasses.filter((_, index) => index !== idx);
            });
          
            // Then update the filesState in sync
            setFilesState((prevFilesState) => {
              return prevFilesState.filter((_, index) => index !== idx);
            });

          };

          const handleFileChange = (newFiles, index) => {
            setFilesState((prevFilesState) => {
              const updatedFilesState = [...prevFilesState];
              const existingFiles = updatedFilesState[index];
          
              // Create a DataTransfer to build a new FileList
              const dataTransfer = new DataTransfer();
          
              // Add existing files (if any)
              if (existingFiles instanceof FileList) {
                for (let i = 0; i < existingFiles.length; i++) {
                  dataTransfer.items.add(existingFiles[i]);
                }
              }
          
              // Add new files
              for (let i = 0; i < newFiles.length; i++) {
                dataTransfer.items.add(newFiles[i]);
              }
          
              updatedFilesState[index] = dataTransfer.files; // New FileList
              console.log("Updated FileList:", updatedFilesState[index]);
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
           
            // Validate that we have the correct number of refs
            if (clsRefs.current.length !== classes.length) {
              console.error('Mismatch: refs count =', clsRefs.current.length, 'classes count =', classes.length);
              setNotification({
                show: true,
                message: 'Internal error: class references are out of sync. Please refresh the page.',
                type: 'error'
              });
              return;
            }

            // Get names from refs with proper validation
            const names = clsRefs.current.map((ref, index) => {
              if (!ref) {
                console.error('Ref is null at index:', index);
                return null;
              }
              if (!ref.current) {
                console.error('Ref.current is null at index:', index);
                return null;
              }
              if (!ref.current.value) {
                console.error('Ref.current.value is empty at index:', index);
                return null;
              }
              return ref.current.value.trim();
            });

            // Validate that all names are present
            const missingNames = names.filter(name => !name);
            if (missingNames.length > 0) {
              console.error('Missing names:', missingNames);
              setNotification({
                show: true,
                message: 'Some class names are missing. Please fill in all class names.',
                type: 'error'
              });
              return;
            }

            console.log('Classes:', classes);
            console.log('Names from refs:', names);
            console.log('Refs count:', clsRefs.current.length);
            console.log('Classes count:', classes.length);

            const formData = new FormData();
            formData.append("modelName", modelName.current.value);  
            formData.append("modelDescription", modelDescription.current.value)
            formData.append("classesCount", classes.length); 
            formData.append("modelArch",modelArch.current.value)
            formData.append("category",modelCategory.current.value)
            formData.append("userId",userId)  
            
            
           
            classes.forEach((classItem, index) => {
              const className = names[index];
              console.log(`Adding class ${index}: ${className}`);
              formData.append(`class_name_${index}`, className);
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
                            fileState={filesState[index]||[]}
                            setter={setFilesState}
                            onFileChange={(e) => handleFileChange(e.target.files, index)}
                            onDelete={()=>handleDeleteClass(index)}
                             key={classItems.id}
                              id={index}
                              classesCount={classes.length}
                              onReset={()=>handleResetClassFiles(index)} />)
                              }
                           
                                
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
