import React, { useEffect, useState } from 'react';
import { useParams,useLocation } from 'react-router-dom';
import Header from '../components/header';
import '../styles/model-dataset.css'; // or your main style

const ModelDataset = () => {
  const apiUrl = import.meta.env.VITE_API_BACKEND_URL
  const { id } = useParams();
  const [dataset, setDataset] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState({});
  const [modalImage, setModalImage] = useState(null);
  const [modelName, setModelName] = useState('');
  const [error,setError]=useState(false)

  const {state}=useLocation()
  useEffect(() => {
    const fetchDataset = async () => {
      setLoading(true);
      try {
     
        const res = await fetch(
         `${apiUrl}/api/classify/dataset/${id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        const data = await res.json();
        if(res.ok){
        setDataset(data.dataset);
        setModelName(data.modelName);
        } 
        else setError(true)
      } catch (err) {
        setDataset([]);
      }
      setLoading(false);
    };
    fetchDataset();
  }, [id]);

  const handleToggleFolder = (className) => {
    setOpenFolders(prev => ({
      ...prev,
      [className]: !prev[className]
    }));
  };

  const handleImageClick = (imgUrl) => {
    setModalImage(imgUrl);
  };

  const handleCloseModal = () => {
    setModalImage(null);
  };

  return (
    <div className="models-page-container">
      <Header />
      <div className="page-content">
        <h2 style={{textAlign:'center',color:'#fff'}}>Dataset for Model: {state.modelName}</h2>
        { error ? <div style={{color:"white", fontSize:"bold"}}> error retreiving dataset !</div>
        :
        loading ? (
          <div style={{color:"white", fontSize:"bold"}}>Loading dataset...</div>
        ) : (
          <div className="dataset-folder-list">
            {dataset.map(cls => (
              <div key={cls.className} className="dataset-class-section">
                <div
                  className="dataset-folder"
                  onClick={() => handleToggleFolder(cls.className)}
                  style={{
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#333',
                    color: '#fff',
                    padding: '8px',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}
                >
                  {openFolders[cls.className] ? '▼' : '►'} {cls.className}
                </div>
                {openFolders[cls.className] && (
                  <div className="dataset-images-grid">
                    {cls.images && cls.images.length > 0 ? (
                      cls.images.map((imgUrl, idx) => (
                        <div key={idx} className="dataset-image-block">
                          <img
                            src={imgUrl}
                            alt={cls.className}
                            className="dataset-image"
                            loading="lazy"
                            onClick={() => handleImageClick(imgUrl)}
                            style={{ cursor: 'pointer' }}
                          />
                          <div className="dataset-label">{cls.className}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#aaa', padding: '12px' }}>No images found for this class.</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {modalImage && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={modalImage} alt="Full size" style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '8px' }} />
            <button className="close-modal-btn" onClick={handleCloseModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelDataset;
