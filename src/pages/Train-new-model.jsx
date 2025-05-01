import React, { useRef, useState,useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import "../styles/train-new-modle.css"
import Button from '../components/Button'
import ClassBlock from '../components/class-block'
import Header from '../components/header'
import axios from 'axios';

const TrainNewModel = () => {

  const navigate=useNavigate()

  useEffect((  )=>{
    const token=localStorage.getItem("token")
    console.log(token)
    if(!token) navigate("/login")
      

  },[navigate])

        const [classes,setClasses]=useState([{id:1, name:"class 1"} , {id:2, name:"class 2"} ])
        const modelName=useRef()
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
        
          // Function to handle removing a class
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
        
       
       
       

          const handleSubmit = () => {
            const names = clsRefs.current.map(ref => ref.current ? ref.current.value : null);
          console.log("inside train new model , , ", localStorage.getItem("token"))
            const formData = new FormData();
            formData.append("modelName", modelName.current.value);  // Append model name
            formData.append("classesCount", classes.length); // Number of classes field
            
            // Add class names and files dynamically
            classes.forEach((classItem, index) => {
              formData.append(`class_name_${index}`, names[index]); // Add class name dynamically
              const dataset = filesState[index];
              if (dataset instanceof FileList) {
                Array.from(dataset).forEach(file => {
                  formData.append(`class_dataset_${index}`, file);  // Append each file under a unique key
                });
              }
            });
          
            // Log the FormData to check the structure
            console.log([...formData.entries()]);  // This will log all key-value pairs in the FormData
          
            // Send the request
            axios.post('http://localhost:5000/api/classify/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',  // Ensure correct content type
                "x-auth-token":localStorage.getItem("token")
              }
            })
              .then((response) => {
                console.log('Files uploaded:', response.data);
              })
              .catch((error) => {
                console.error('Error uploading files:', error);
              });
          };
          
          
          
          
          
          
          
    return (
    <div className='full-page-container'>
        <Header/>
            <div className='newModel-container' >
                    
                    <div className='head'>
                    <input type="text" ref={modelName} placeholder='Model name' class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp"/>
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
                              id={classItems.id} />)}
                                
                    </div>




                    <div className='user-options'>

                            <Button type="button" className="btn btn-primary" onClick={handleSubmit} > Train </Button>

                            <Button  type="button" className="btn btn-secondary" onClick={handleAddClass} >Add class</Button>

                    </div>

                
            </div>
    </div>
  )
}

export default TrainNewModel
