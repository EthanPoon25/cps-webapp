import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, CheckCircle, FileText, Cpu, Database, Activity, ChevronRight, ChevronLeft, FolderOpen } from 'lucide-react';
import JSZip from 'jszip';
import {Settings, Trash2, Eye, EyeOff } from 'lucide-react';
import { Zap } from 'lucide-react'; // or whichever library you’re using

function App() {
  const [currentPage, setCurrentPage] = useState(0);
  const [config, setConfig] = useState({
    resourceTypes: [],
    partitions: {},
    files: []
  });

  const pages = [
    { id: 'config', title: 'Resource Types', component: ResourceTypesPage },
    { id: 'phase', title: 'Taskset Config', component: TasksetConfigurationPage },
    { id: 'taskset', title: 'Upload and Process Files', component: FileUploadPage },
    { id: 'generation', title: 'Taskset Generation', component: TasksetGenerationPage }
  ];

  const canProceed = (pageIndex) => {
    switch (pageIndex) {
      case 0: // Algo
        return (
        config.maxPart!== config.minPart && config.maxBandwidth!== config.minBandwidth
      );
      case 1:
        return config.algorithm?.type;
      case 2: // File Upload
         return (config.tasks?.length ?? 0) > 0;;
      case 3: // Phase Detection
        return config.algorithm;
      default:
        return false;
    }
  };

  const nextPage = () => {
    if (currentPage < pages.length - 1 && canProceed(currentPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const CurrentPageComponent = pages[currentPage].component;

  return (
    
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1152px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <div style={{
              backgroundColor: '#2563eb',
              padding: '12px',
              borderRadius: '50%'
            }}>
              <Activity style={{ width: '32px', height: '32px', color: 'white' }} />
            </div>
          </div>
          <h1 style={{
            fontSize: '30px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Dependency Analysis Platform
          </h1>
          <p style={{
            color: '#6b7280',
            maxWidth: '512px',
            margin: '0 auto'
          }}>
            A configurable interface for analyzing execution behaviors and exploring parameterized system behaviors across varied workload inputs.
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            {pages.map((page, index) => (
              <div key={page.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2px solid',
                  fontSize: '14px',
                  fontWeight: '600',
                  backgroundColor: index <= currentPage ? '#2563eb' : 'white',
                  borderColor: index <= currentPage ? '#2563eb' : '#d1d5db',
                  color: index <= currentPage ? 'white' : '#9ca3af'
                }}>
                  {index + 1}
                </div>
                <div style={{ marginLeft: '12px', fontSize: '14px' }}>
                  <div style={{
                    fontWeight: '500',
                    color: index <= currentPage ? '#2563eb' : '#9ca3af'
                  }}>
                    {page.title}
                  </div>
                </div>
                {index < pages.length - 1 && (
                  <ChevronRight style={{
                    width: '20px',
                    height: '20px',
                    color: '#d1d5db',
                    margin: '0 16px'
                  }} />
                )}
              </div>
            ))}
          </div>
          <div style={{
            width: '100%',
            backgroundColor: '#e5e7eb',
            borderRadius: '9999px',
            height: '8px'
          }}>
            <div style={{
              backgroundColor: '#2563eb',
              height: '8px',
              borderRadius: '9999px',
              transition: 'all 0.3s',
              width: `${((currentPage + 1) / pages.length) * 100}%`
            }} />
          </div>
        </div>

        {/* Page Content */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: '32px',
          marginBottom: '24px'
        }}>
          <CurrentPageComponent config={config} updateConfig={updateConfig} />
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={prevPage}
            disabled={currentPage === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '500',
              transition: 'colors 0.2s',
              backgroundColor: currentPage === 0 ? '#f3f4f6' : '#e5e7eb',
              color: currentPage === 0 ? '#9ca3af' : '#374151',
              border: 'none',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft style={{ width: '20px', height: '20px', marginRight: '8px' }} />
            Previous
          </button>

          <button
            onClick={nextPage}
            disabled={currentPage === pages.length - 1 || !canProceed(currentPage)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '500',
              transition: 'colors 0.2s',
              backgroundColor: (currentPage === pages.length - 1 || !canProceed(currentPage)) ? '#f3f4f6' : '#2563eb',
              color: (currentPage === pages.length - 1 || !canProceed(currentPage)) ? '#9ca3af' : 'white',
              border: 'none',
              cursor: (currentPage === pages.length - 1 || !canProceed(currentPage)) ? 'not-allowed' : 'pointer'
            }}
          >
            Next
            <ChevronRight style={{ width: '20px', height: '20px', marginLeft: '8px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Page 1: Resource Types
function ResourceTypesPage({ config, updateConfig }) {
  const resourceTypeOptions = [
    { id: 'cache', label: 'Cache Memory', icon: Database, description: 'L1/L2/L3 cache analysis' },
    { id: 'memory', label: 'Memory Bandwidth', icon: Activity, description: 'RAM bandwidth utilization' },
  ];


  const updateResourceType = (resourceId, checked) => {
    const newResourceTypes = checked 
      ? [...config.resourceTypes, resourceId]
      : config.resourceTypes.filter(id => id !== resourceId);
    
    const newPartitions = { ...config.partitions };
    if (!checked) {
      delete newPartitions[resourceId];
    } else if (!newPartitions[resourceId]) {
      newPartitions[resourceId] = 4;
    }

    updateConfig({
      resourceTypes: newResourceTypes,
      partitions: newPartitions
    });
  };

  const updatePartitions = (resourceId, count) => {
    updateConfig(prevConfig => ({
      ...prevConfig,
      partitions: {
        ...prevConfig.partitions,
        [resourceId]: parseInt(count) || 1
      }
    }));
  };

  // Handlers for the new configuration sections
  const handleMaxPartChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = 1;
    if (val > 21) val = 21;
    if (val < 1) val = 1;
    
    // Ensure max is not less than min
    const currentMin = config.minPart || 1;
    if (val < currentMin) {
      val = currentMin;
    }
    
    updateConfig({ ...config, maxPart: val });
    
    // Optional: Send to backend
    fetch('/update-max-partitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPart: val })
    })
    .then(response => response.json())
    .then(data => console.log('Max partitions updated:', data))
    .catch(error => console.error('Error updating max partitions:', error));
  };

  const handleMinPartChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = 1;
    if (val > 21) val = 21;
    if (val < 1) val = 1;
    
    // Ensure min is not greater than max
    const currentMax = config.maxPart || 21;
    if (val > currentMax) {
      val = currentMax;
    }
    
    updateConfig({ ...config, minPart: val });
    
    // Optional: Send to backend
    fetch('/update-min-partitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minPart: val })
    })
    .then(response => response.json())
    .then(data => console.log('Min partitions updated:', data))
    .catch(error => console.error('Error updating min partitions:', error));
  };

  const handleMaxBandwidthChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = 1;
    if (val > 21) val = 21;
    if (val < 1) val = 1;
    
    // Ensure max is not less than min
    const currentMin = config.minBandwidth || 1;
    if (val < currentMin) {
      val = currentMin;
    }
    
    updateConfig({ ...config, maxBandwidth: val });
    
    // Optional: Send to backend
    fetch('/update-max-bandwidth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxBandwidth: val })
    })
    .then(response => response.json())
    .then(data => console.log('Max bandwidth updated:', data))
    .catch(error => console.error('Error updating max bandwidth:', error));
  };

  const handleMinBandwidthChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = 1;
    if (val > 10000) val = 10000;
    if (val < 1) val = 1;
    
    // Ensure min is not greater than max
    const currentMax = config.maxBandwidth || 21;
    if (val > currentMax) {
      val = currentMax;
    }
    
    updateConfig({ ...config, minBandwidth: val });
    
    // Optional: Send to backend
    fetch('/update-min-bandwidth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minBandwidth: val })
    })
    .then(response => response.json())
    .then(data => console.log('Min bandwidth updated:', data))
    .catch(error => console.error('Error updating min bandwidth:', error));
  };

  React.useEffect(() => {
    if (!config) return;

    const requestBody = {
      minPart: config.minPart,
      maxPart: config.maxPart,
      minBandwidth: config.minBandwidth,
      maxBandwidth: config.maxBandwidth,
      
    };
  fetch('http://localhost:3001/api/send-data', {   // point to your backend
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => response.json())
    .then((data) => {
      // 👇 log confirmation on frontend
      console.log('📩 Frontend got confirmation from backend:', data);
    })
    .catch((error) => {
      console.error('❌ Error sending data:', error);
    });
  
  }, [
    config.minPart,
    config.maxPart,
    config.minBandwidth,
    config.maxBandwidth,
    
  ]);

  return (
    <div>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: '24px'
      }}>
        Configure System Resources
      </h2>
      <p style={{
        color: '#6b7280',
        marginBottom: '32px'
      }}>
        Set maximum resource limits and choose the system resources you want to analyze.
      </p>

      {/* System Configuration Section */}
      <div style={{ 
        display: 'grid', 
        gap: '24px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        marginBottom: '40px'
      }}>
        {/* Cache Partitions Configuration */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Settings style={{ width: '20px', height: '20px', marginRight: '8px', color: '#2563eb' }} />
            Cache Partitions Range
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px', 
            marginBottom: '12px' 
          }}>
            <div>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'block',
                marginBottom: '8px'
              }}>
                Minimum Partitions
              </label>
              <input
                type="number"
                min="1"
                max="21"
                value={config.minPart || 1}
                onChange={handleMinPartChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              />
            </div>
            
            <div>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'block',
                marginBottom: '8px'
              }}>
                Maximum Partitions
              </label>
              <input
                type="number"
                min="1"
                max="21"
                value={config.maxPart || 1}
                onChange={handleMaxPartChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              />
            </div>
          </div>
          
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            Range: {config.minPart || 1} - {config.maxPart || 1} cache partitions available for task isolation
          </p>
        </div>

        {/* Memory Bandwidth Configuration */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Zap style={{ width: '20px', height: '20px', marginRight: '8px', color: '#2563eb' }} />
            Memory Bandwidth Range
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px', 
            marginBottom: '12px' 
          }}>
            <div>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'block',
                marginBottom: '8px'
              }}>
                Minimum Partitions
              </label>
              <input
                type="number"
                min="1"
                max="21"
                step="1"
                value={config.minBandwidth || 1}
                onChange={handleMinBandwidthChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              />
            </div>
            
            <div>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'block',
                marginBottom: '8px'
              }}>
                Maximum Partitions
              </label>
              <input
                type="number"
                min="1"
                max="21"
                step="1"
                value={config.maxBandwidth || 1}
                onChange={handleMaxBandwidthChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              />
            </div>
          </div>
          
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            Range: {config.minBandwidth || 1} - {config.maxBandwidth || 1} partitions memory bandwidth available for task allocation
          </p>
        </div>
      </div>

      {/* Resource Types Selection */}
      
    </div>
  );
}


// Page 2: Taskset Configuration
function TasksetConfigurationPage({ config, updateConfig }) {
  const algorithms = [
    {
      id: 'dna',
      label: 'DNA (Dynamic Resource Allocation)',
      description: 'Phase‑aware scheduler for soft real‑time multicore systems',
    
    },
    {
      id: 'rasco',
      label: 'Rasco (Resource Allocation and Scheduling Co-design)',
      description: 'Temperature-based optimization for global minimum search',
      
    }
  ];

  const tasksetConfigs = [
    { id: 'light', label: 'Light Load', tasks: '10-50', utilization: '40-60%' },
    { id: 'medium', label: 'Medium Load', tasks: '50-150', utilization: '60-80%' },
    { id: 'heavy', label: 'Heavy Load', tasks: '150-300', utilization: '80-95%' },
    { id: 'custom', label: 'Custom Configuration', tasks: 'User-defined', utilization: 'Variable' }
  ];

  const updateAlgorithm = (algorithmId) => {
    const algorithm = algorithms.find(a => a.id === algorithmId);
    updateConfig({
      algorithm: {
        type: algorithmId,
      }
    });
  };

  const updateAlgorithmParameter = (param, value) => {
    updateConfig({
      algorithm: {
        ...config.algorithm,
        
      }
    });
  };

  const updateTasksetConfig = (configType) => {
    const baseConfig = { type: configType };
    
    if (configType === 'custom') {
      baseConfig.customParams = {
        minTasks: 10,
        maxTasks: 100,
        minUtilization: 0.4,
        maxUtilization: 0.9,
        taskTypes: ['periodic', 'aperiodic'],
        priorityLevels: 5
      };
    }
    
    updateConfig({ tasksetConfig: baseConfig });
  };

  const updateCustomParam = (param, value) => {
    updateConfig({
      tasksetConfig: {
        ...config.tasksetConfig,
        customParams: {
          ...config.tasksetConfig?.customParams,
          [param]: typeof value === 'string' ? value : parseFloat(value) || value
        }
      }
    });
  };

  const selectedAlgorithm = algorithms.find(a => a.id === config.algorithm?.type);
  const selectedTaskset = config.tasksetConfig?.type;

  return (
    <div>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: '24px'
      }}>
        Taskset Configuration
      </h2>
      <p style={{
        color: '#6b7280',
        marginBottom: '32px'
      }}>
        Configure the optimization algorithm and taskset parameters for your analysis.
      </p>

      {/* Algorithm Selection */}
      <div style={{ marginBottom: '48px' }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '16px'
        }}>
          Optimization Algorithm
        </h3>
        
        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
          {algorithms.map((algorithm) => {
            const isSelected = config.algorithm?.type === algorithm.id;
            
            return (
              <div key={algorithm.id} style={{
                border: '2px solid',
                borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                borderRadius: '8px',
                padding: '24px',
                transition: 'all 0.2s',
                backgroundColor: isSelected ? '#eff6ff' : 'white',
                cursor: 'pointer'
              }}
              onClick={() => updateAlgorithm(algorithm.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <input
                    type="radio"
                    checked={isSelected}
                    onChange={() => updateAlgorithm(algorithm.id)}
                    style={{
                      marginTop: '4px',
                      width: '20px',
                      height: '20px',
                      accentColor: '#2563eb'
                    }}
                  />
                  <div style={{ marginLeft: '16px', flex: 1 }}>
                    <h4 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '8px'
                    }}>
                      {algorithm.label}
                    </h4>
                    <p style={{
                      color: '#6b7280',
                      marginBottom: '16px'
                    }}>
                      {algorithm.description}
                    </p>
                    

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      

      {(selectedAlgorithm && selectedTaskset) && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircle style={{
              width: '20px',
              height: '20px',
              color: '#16a34a',
              marginRight: '8px'
            }} />
            <span style={{
              color: '#15803d',
              fontWeight: '500'
            }}>
              {selectedAlgorithm.label} algorithm configured with {tasksetConfigs.find(t => t.id === selectedTaskset)?.label.toLowerCase()} taskset
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


// Page 3: Phase Detection Configuration
function PhaseDetectionPage({ config, updateConfig }) {
  const [customThreshold, setCustomThreshold] = useState('');
  
  const detectionMethods = [
    { 
      id: 'statistical', 
      label: 'Statistical Analysis', 
      description: 'Uses variance and mean shift detection',
      params: ['threshold', 'windowSize']
    },
    { 
      id: 'changepoint', 
      label: 'Change Point Detection', 
      description: 'Identifies structural breaks in time series',
      params: ['sensitivity', 'minPhaseLength']
    },
    { 
      id: 'clustering', 
      label: 'Clustering-based', 
      description: 'Groups similar execution behaviors',
      params: []
    }
  ];

  const updatePhaseDetection = (method) => {
    updateConfig({
      phaseDetection: {
        method,
        parameters: getDefaultParams(method)
      }
    });
  };

  const getDefaultParams = (method) => {
    const defaults = {
      statistical: { threshold: 0.1, windowSize: 100 },
      changepoint: { sensitivity: 0.05, minPhaseLength: 50 },
      clustering: { clusters: 5},
      machine_learning: { modelType: 'lstm', trainingRatio: 0.8 }
    };
    return defaults[method] || {};
  };

  const updateParameter = (param, value) => {
    updateConfig({
      phaseDetection: {
        ...config.phaseDetection,
        parameters: {
          ...config.phaseDetection?.parameters,
          [param]: value
        }
      }
    });
  };

  const selectedMethod = config.phaseDetection?.method;
  const currentParams = config.phaseDetection?.parameters || {};

  return (
    <div>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: '24px'
      }}>
        Phase Detection Configuration
      </h2>
      <p style={{
        color: '#6b7280',
        marginBottom: '32px'
      }}>
        Select the method for detecting execution phases in your workload data and configure its parameters.
      </p>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
        {detectionMethods.map((method) => {
          const isSelected = selectedMethod === method.id;
          
          return (
            <div key={method.id} style={{
              border: '2px solid',
              borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
              borderRadius: '8px',
              padding: '24px',
              transition: 'all 0.2s',
              backgroundColor: isSelected ? '#eff6ff' : 'white',
              cursor: 'pointer'
            }}
            onClick={() => updatePhaseDetection(method.id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => updatePhaseDetection(method.id)}
                  style={{
                    marginTop: '4px',
                    width: '20px',
                    height: '20px',
                    accentColor: '#2563eb'
                  }}
                />
                <div style={{ marginLeft: '16px', flex: 1 }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '8px'
                  }}>
                    {method.label}
                  </h3>
                  <p style={{
                    color: '#6b7280',
                    marginBottom: '16px'
                  }}>
                    {method.description}
                  </p>
                  
                  {isSelected && (
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '16px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '12px'
                      }}>
                        Parameters
                      </h4>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {method.params.map((param) => (
                          <div key={param} style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#374151',
                              minWidth: '120px',
                              textTransform: 'capitalize'
                            }}>
                              {param.replace(/([A-Z])/g, ' $1')}:
                            </label>
                            {typeof currentParams[param] === 'number' ? (
                              <input
                                type="number"
                                step="0.01"
                                value={currentParams[param] || ''}
                                onChange={(e) => updateParameter(param, parseFloat(e.target.value) || 0)}
                                style={{
                                  marginLeft: '12px',
                                  padding: '6px 12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                  width: '120px'
                                }}
                              />
                            ) : (
                              <select
                                value={currentParams[param] || ''}
                                onChange={(e) => updateParameter(param, e.target.value)}
                                style={{
                                  marginLeft: '12px',
                                  padding: '6px 12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                  width: '150px'
                                }}
                              >
                                
                                {param === 'modelType' && (
                                  <>
                                    <option value="lstm">LSTM</option>
                                    <option value="gru">GRU</option>
                                    <option value="transformer">Transformer</option>
                                  </>
                                )}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMethod && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircle style={{
              width: '20px',
              height: '20px',
              color: '#16a34a',
              marginRight: '8px'
            }} />
            <span style={{
              color: '#15803d',
              fontWeight: '500'
            }}>
              {detectionMethods.find(m => m.id === selectedMethod)?.label} method configured
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Page 4: Taskset Configuration
function FileUploadPage({ config, updateConfig }) {
  const [dragActive, setDragActive] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [phases, setPhases] = useState('');
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [clusternum, setClusternum] = useState('');
  const [expandedTask, setExpandedTask] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  

  const tasks = config.tasks || [];

  // FIXED: Store actual File objects properly
  const addFiles = (newFiles) => {
    const validTypes = ['.csv', '.json', '.xml', '.txt', '.dat', '.xlsx', '.zip'];
    const filtered = newFiles.filter(file =>
      validTypes.some(ext => file.name.toLowerCase().endsWith(ext))
    );
    
    // Store the actual File object directly
    const filesWithIds = filtered.map(file => {
      const isZip = file.name.toLowerCase().endsWith('.zip');
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadTime: new Date().toISOString(),
        actualFile: file,
        isZipFile: isZip // Flag to identify zip files
      };
    });
    
    setFiles(prev => [...prev, ...filesWithIds]);
  };
  

  // Replace the processCurrentTask function with this fixed version:
const processCurrentTask = async () => {
  if (!taskName.trim()) return alert('Enter a task name.');
  if (!clusternum.trim()) return alert('Enter number of clusters.');
  if (files.length === 0) return alert('Upload files first.');

  console.log('=== DEBUGGING FILE UPLOAD ===');
  console.log('Files in state:', files);
  console.log('Number of files:', files.length);

  // Validate that we have actual File objects
  const validFiles = files.filter(fileObj => fileObj.actualFile instanceof File);
  if (validFiles.length === 0) {
    alert('No valid files found. Please upload files again.');
    return;
  }

  const formData = new FormData();
  formData.append('task', taskName.trim());
  formData.append('phases', phases.trim());
  formData.append('clusters', clusternum.trim());
  formData.append('perConfig', '100');

  // Add current configuration settings
  if (config.phaseDetection) {
    formData.append('phaseDetection', JSON.stringify(config.phaseDetection));
  }
  if (config.algorithm) {
    formData.append('algorithm', JSON.stringify(config.algorithm));
  }
  if (config.tasksetConfig) {
    formData.append('tasksetConfig', JSON.stringify(config.tasksetConfig));
  }

  // Add the actual File objects to FormData
  validFiles.forEach((fileObj, index) => {
    console.log(`Adding file ${index}: ${fileObj.name}`);
    formData.append('files', fileObj.actualFile);
  });

  // Debug FormData
  console.log('=== FORMDATA CONTENTS ===');
  for (let [key, value] of formData.entries()) {
    console.log(`${key}:`, value);
    if (value instanceof File) {
      console.log(`  -> File name: ${value.name}, size: ${value.size}`);
    }
  }

  setProcessing(true);
  setProcessingStatus('Processing current task...');

  try {
    console.log('=== MAKING REQUEST ===');
    const response = await fetch('http://localhost:3001/api/process', {
      method: 'POST',
      body: formData
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Response data:', data);
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    // FIXED: Use the correct download URL format that matches the server route
    const downloadUrl = `http://localhost:3001/download/${encodeURIComponent(taskName.trim())}`;
    
    setDownloadUrl(downloadUrl);
    setProcessingStatus('Done, download output');
    
  } catch (err) {
    console.error('Error details:', err);
    setProcessingStatus(`Error: ${err.message}`);
    alert(`Error: ${err.message}`);
  } finally {
    setProcessing(false);
  }
};

// Replace the processBatchTasks function with this fixed version:
const processBatchTasks = async () => {
  if (tasks.length === 0) {
    return alert('No saved tasks to process. Please save at least one task first.');
  }

  // Check if any tasks have files that need to be re-uploaded
  const tasksNeedingFiles = tasks.filter(task => !task.uploadedFiles || task.uploadedFiles.length === 0);
  if (tasksNeedingFiles.length > 0) {
    return alert(`Some tasks need files to be re-uploaded: ${tasksNeedingFiles.map(t => t.name).join(', ')}`);
  }

  setProcessing(true);
  setProcessingStatus('Processing batch tasks...');

  const results = [];
  let successCount = 0;
  let failCount = 0;

  try {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      setProcessingStatus(`Processing task ${i + 1}/${tasks.length}: ${task.name}`);

      try {
        const formData = new FormData();
        formData.append('task', task.name);
        formData.append('phases', task.phases);
        formData.append('clusters', task.clusters);
        formData.append('perConfig', '100');

        // Add task-specific configuration
        if (task.phaseDetection) {
          formData.append('phaseDetection', JSON.stringify(task.phaseDetection));
        }
        if (task.algorithm) {
          formData.append('algorithm', JSON.stringify(task.algorithm));
        }
        if (task.tasksetConfig) {
          formData.append('tasksetConfig', JSON.stringify(task.tasksetConfig));
        }

        // Add the uploaded files for this task
        if (task.uploadedFiles) {
          task.uploadedFiles.forEach((fileObj, index) => {
            if (fileObj.actualFile instanceof File) {
              formData.append('files', fileObj.actualFile);
            }
          });
        }

        console.log(`=== PROCESSING TASK: ${task.name} ===`);
        console.log('Task configuration:', {
          phaseDetection: task.phaseDetection,
          algorithm: task.algorithm,
          tasksetConfig: task.tasksetConfig
        });

        const response = await fetch('http://localhost:3001/api/process', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        // FIXED: Use the correct download URL format that matches the server route
        const downloadUrl = `http://localhost:3001/download/${encodeURIComponent(task.name)}`;

        results.push({
          taskName: task.name,
          success: true,
          downloadUrl: downloadUrl,
          message: 'Processed successfully'
        });
        successCount++;

      } catch (taskError) {
        console.error(`Error processing task ${task.name}:`, taskError);
        results.push({
          taskName: task.name,
          success: false,
          error: taskError.message,
          message: `Error: ${taskError.message}`
        });
        failCount++;
      }

      // Small delay between tasks to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update status with final results
    setProcessingStatus(`Batch complete: ${successCount} successful, ${failCount} failed`);
    
    // Store results for download links
    setDownloadUrl(results.filter(r => r.success).map(r => ({
      taskName: r.taskName,
      url: r.downloadUrl
    })));

  } catch (err) {
    console.error('Batch processing error:', err);
    setProcessingStatus(`Batch processing failed: ${err.message}`);
    alert(`Batch processing failed: ${err.message}`);
  } finally {
    setProcessing(false);
  }
};

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const saveTask = () => {
    if (!taskName.trim()) return alert('Enter a task name.');
    if (!clusternum.trim()) return alert('Enter number of clusters/phases.');
    if (files.length === 0) return alert('Upload files first.');

    // Check if task name already exists
    if (tasks.some(task => task.name.toLowerCase() === taskName.trim().toLowerCase())) {
      return alert('A task with this name already exists. Please choose a different name.');
    }

    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      name: taskName.trim(),
      phases: phases.trim(),
      clusters: clusternum.trim(),
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type })), // Store file metadata
      uploadedFiles: files, // Store actual files for processing
      fileCount: files.length,
      createdAt: new Date().toISOString(),
      // Store current configuration settings
      phaseDetection: config.phaseDetection || null,
      algorithm: config.algorithm || null,
      tasksetConfig: config.tasksetConfig || null
    };
    
    updateConfig({ tasks: [...tasks, newTask] });

    // Reset current form
    setTaskName('');
    setPhases('');
    setClusternum('');
    setFiles([]);
    
    alert('Task saved successfully! You can now process all saved tasks as a batch.');
  };

  const removeTask = (id) => {
    updateConfig({ tasks: tasks.filter(t => t.id !== id) });
  };

  const loadTask = (task) => {
    setTaskName(task.name);
    setPhases(task.phases);
    setClusternum(task.clusters);
    // Note: We can't restore the actual files, only show the metadata
    alert(`Task "${task.name}" settings loaded. Please re-upload the files to process.`);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + [' Bytes', ' KB', ' MB', ' GB'][i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getConfigSummary = (task) => {
    const summary = [];
    
    if (task.phaseDetection?.method) {
      summary.push(`Phase Detection: ${task.phaseDetection.method}`);
    }
    
    if (task.algorithm?.type) {
      summary.push(`Algorithm: ${task.algorithm.type}`);
    }
    
    if (task.tasksetConfig?.type) {
      summary.push(`Taskset: ${task.tasksetConfig.type}`);
    }
    
    return summary.length > 0 ? summary.join(' | ') : 'No configuration saved';
  };

  const handleFiles = async (fileList) => {
    // Handle zip files and regular files differently for display
    const files = Array.from(fileList);
    addFiles(files);
  };

  const toggleTaskExpansion = (taskId) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        Upload Folder + Save as Task
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Upload Folder Box */}
        <div
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: dragActive ? '#eff6ff' : 'white',
          }}
          onClick={() => folderInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={folderInputRef}
            type="file"
            style={{ display: 'none' }}
            webkitdirectory=""
            onChange={(e) => addFiles(Array.from(e.target.files))}
          />
          <FolderOpen style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Upload Folder</h3>
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>
            Drop a folder or click to upload
          </p>
        </div>

        {/* Upload File Box */}
        <div
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: dragActive ? '#eff6ff' : 'white',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.json,.xml,.txt,.dat,.xlsx,.zip"
            onChange={(e) => handleFiles(Array.from(e.target.files))}
            style={{ display: 'none' }}
          />
          <Upload style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Upload Files or Zip Folders</h3>
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>
            Drop files here or click to upload
          </p>
        </div>
      </div>

      {/* Inputs and Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <input
          type="text"
          placeholder="Task Name"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          style={{
            width: '400px',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #d1d5db'
          }}
        />
      
        <input
          type="text"
          placeholder="Cluster/Phase # (e.g., 3 or 4)"
          value={clusternum}
          onChange={(e) => setClusternum(e.target.value)}
          style={{
            width: '200px',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #d1d5db'
          }}
        />
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={saveTask}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '10px 20px',
              fontSize: '16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Save Task
          </button>
          
          <button
            onClick={processCurrentTask}
            disabled={processing}
            style={{
              backgroundColor: processing ? '#9ca3af' : '#10b981',
              color: 'white',
              padding: '10px 20px',
              fontSize: '16px',
              borderRadius: '6px',
              border: 'none',
              cursor: processing ? 'not-allowed' : 'pointer'
            }}
          >
            {processing ? 'Processing...' : 'Process Current Task'}
          </button>

          <button
            onClick={processBatchTasks}
            disabled={processing || tasks.length === 0}
            style={{
              backgroundColor: processing || tasks.length === 0 ? '#9ca3af' : '#7c3aed',
              color: 'white',
              padding: '10px 20px',
              fontSize: '16px',
              borderRadius: '6px',
              border: 'none',
              cursor: processing || tasks.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {processing ? 'Processing Batch...' : `Process All Tasks (${tasks.length})`}
          </button>
        </div>

        {processingStatus && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: processingStatus.includes('Error') || processingStatus.includes('failed') ? '#fee2e2' : '#d1fae5',
            color: processingStatus.includes('Error') || processingStatus.includes('failed') ? '#dc2626' : '#16a34a',
            marginTop: '12px',
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            {processingStatus}
          </div>
        )}

        {/* Updated download links section - replace the existing one */}
          {Array.isArray(downloadUrl) && downloadUrl.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                Batch Processing Results:
              </h4>
              {downloadUrl.map((result, index) => (
                <a
                  key={index}
                  href={result.url || result} // Handle both old and new format
                  download
                  style={{
                    color: '#2563eb',
                    display: 'block',
                    marginBottom: '4px',
                    textDecoration: 'underline',
                    fontSize: '14px'
                  }}
                >
                  Download {result.taskName ? `${result.taskName} Results` : `Result ${index + 1}`}
                </a>
              ))}
            </div>
          )}

          {typeof downloadUrl === 'string' && downloadUrl && (
            <a
              href={downloadUrl}
              download
              style={{
                color: '#2563eb',
                marginTop: '12px',
                display: 'inline-block',
                textDecoration: 'underline',
                fontSize: '16px'
              }}
            >
              Download Results
            </a>
          )}

        
      </div>

      {/* Preview current uploads */}
      {files.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontWeight: '600' }}>Files ready for processing ({files.length})</h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '8px' }}>
            {files.map(file => (
              <div key={file.id} style={{
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <span>{file.name}</span>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>{formatFileSize(file.size)}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#dc2626',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved tasks section */}
      {tasks.length > 0 && (
        <div>
          <h3 style={{ fontWeight: '600', marginBottom: '16px', fontSize: '20px' }}>
            Saved Tasks ({tasks.length})
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {tasks.map(task => (
              <div key={task.id} style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {/* Task Header */}
                <div style={{
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'white'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: '16px', 
                      color: '#111827',
                      marginBottom: '4px' 
                    }}>
                      {task.name}
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      Phases: {task.phases} | Clusters: {task.clusters} | Files: {task.fileCount}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Created: {formatDate(task.createdAt)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => toggleTaskExpansion(task.id)}
                      style={{
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={expandedTask === task.id ? 'Hide details' : 'Show details'}
                    >
                      {expandedTask === task.id ? 
                        <EyeOff style={{ width: '16px', height: '16px' }} /> : 
                        <Eye style={{ width: '16px', height: '16px' }} />
                      }
                    </button>
                    
                    <button
                      onClick={() => loadTask(task)}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      title="Load task settings"
                    >
                      Load
                    </button>
                    
                    <button
                      onClick={() => removeTask(task.id)}
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Delete task"
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTask === task.id && (
                  <div style={{ 
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    {/* Configuration Summary */}
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ 
                        fontWeight: '600', 
                        fontSize: '14px', 
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <Settings style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                        Configuration
                      </h4>
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#6b7280',
                        backgroundColor: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #e5e7eb'
                      }}>
                        {getConfigSummary(task)}
                      </div>
                    </div>

                    {/* Detailed Configuration */}
                    {(task.phaseDetection || task.algorithm || task.tasksetConfig) && (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '12px',
                        marginBottom: '16px'
                      }}>
                        {task.phaseDetection && (
                          <div style={{
                            backgroundColor: 'white',
                            padding: '12px',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <h5 style={{ 
                              fontWeight: '600', 
                              fontSize: '13px', 
                              color: '#374151',
                              marginBottom: '6px'
                            }}>
                              Phase Detection
                            </h5>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              Method: {task.phaseDetection.method}
                              {task.phaseDetection.parameters && Object.keys(task.phaseDetection.parameters).length > 0 && (
                                <div style={{ marginTop: '4px' }}>
                                  Parameters: {JSON.stringify(task.phaseDetection.parameters)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {task.algorithm && (
                          <div style={{
                            backgroundColor: 'white',
                            padding: '12px',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <h5 style={{ 
                              fontWeight: '600', 
                              fontSize: '13px', 
                              color: '#374151',
                              marginBottom: '6px'
                            }}>
                              Algorithm
                            </h5>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              Type: {task.algorithm.type}
                            </div>
                          </div>
                        )}

                        {task.tasksetConfig && (
                          <div style={{
                            backgroundColor: 'white',
                            padding: '12px',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <h5 style={{ 
                              fontWeight: '600', 
                              fontSize: '13px', 
                              color: '#374151',
                              marginBottom: '6px'
                            }}>
                              Taskset Config
                            </h5>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              Type: {task.tasksetConfig.type}
                              {task.tasksetConfig.customParams && (
                                <div style={{ marginTop: '4px' }}>
                                  Custom params: {JSON.stringify(task.tasksetConfig.customParams)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Files List */}
                    <div>
                      <h4 style={{ 
                        fontWeight: '600', 
                        fontSize: '14px', 
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Files ({task.files.length})
                      </h4>
                      <div style={{ 
                        maxHeight: '150px', 
                        overflowY: 'auto',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px'
                      }}>
                        {task.files.map((file, index) => (
                          <div key={index} style={{
                            padding: '8px 12px',
                            borderBottom: index < task.files.length - 1 ? '1px solid #f3f4f6' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '13px', color: '#374151' }}>
                              {file.name}
                            </span>
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// Page 5: Taskset Generation Parameters
function TasksetGenerationPage({ config, updateConfig }) {
  const [targetUtil, setTargetUtil] = useState(config.tasksetGeneration?.targetUtil || 0.8);
  const [minUtil, setMinUtil] = useState(config.tasksetGeneration?.minUtil || 0.1);
  const [maxUtil, setMaxUtil] = useState(config.tasksetGeneration?.maxUtil || 0.3);
  const [numCores, setNumCores] = useState(config.tasksetGeneration?.numCores || 4);
  const [maxPart, setMaxPart] = useState(config.tasksetGeneration?.maxPart || 21);
  const [maxBandwidth, setMaxBandwidth] = useState(config.tasksetGeneration?.maxBandwidth || 21); // Default 1000 MB/s
  const [isValid, setIsValid] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [error, setError] = useState(null);

  // Validation function
  const validateInputs = () => {
    const valid = 
      targetUtil > 0 && targetUtil <= 1 &&
      minUtil > 0 && minUtil <= 1 &&
      maxUtil > 0 && maxUtil <= 1 &&
      minUtil < maxUtil &&
      numCores > 0 && numCores <= 64 &&
      maxPart > 0 && maxPart <= 21 &&
      maxBandwidth > 0 && maxBandwidth <= 21; // Max 10 GB/s
    
    setIsValid(valid);
    return valid;
  };

  // Update config whenever inputs change
  React.useEffect(() => {
    const valid = validateInputs();
    if (valid) {
      updateConfig({
        tasksetGeneration: {
          targetUtil,
          minUtil,
          maxUtil,
          numCores: parseInt(numCores),
        }
      });
    }
  }, [targetUtil, minUtil, maxUtil, numCores,]);

  const handleTargetUtilChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      setTargetUtil(value);
    }
  };

  const handleMinUtilChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      setMinUtil(value);
    }
  };

  const handleMaxUtilChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      setMaxUtil(value);
    }
  };

  const handleNumCoresChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 64) {
      setNumCores(value);
    }
  };

  const handleMaxPartChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 21) {
      setMaxPart(value);
    }
  };

  const handleMaxBandwidthChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 21) {
      setMaxBandwidth(value);
    }
  };

  const getValidationMessage = () => {
    if (targetUtil <= 0 || targetUtil > 1) return "Target utilization must be between 0 and 1";
    if (minUtil <= 0 || minUtil > 1) return "Minimum utilization must be between 0 and 1";
    if (maxUtil <= 0 || maxUtil > 1) return "Maximum utilization must be between 0 and 1";
    if (minUtil >= maxUtil) return "Minimum utilization must be less than maximum utilization";
    if (numCores <= 0 || numCores > 64) return "Number of cores must be between 1 and 64";
    if (maxPart <= 0 || maxPart > 21) return "Maximum partitions must be between 1 and 21";
    if (maxBandwidth <= 0 || maxBandwidth > 21) return "Maximum bandwidth must be between 1 and 21 partitions";
    return "";
  };

  // Function to handle task generation
  const handleGenerateTaskset = async () => {
    if (!isValid) {
      setError("Please fix validation errors before generating taskset");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);

    try {
      // Get the task name from config (assuming it was set in an earlier step)
      const taskName = config.selectedTask || config.task;

      const requestBody = {
        targetUtil: targetUtil,
        minWithin: minUtil,
        maxWithin: maxUtil,
        cores: numCores,
        maxPart: maxPart,
        maxBandwidth: maxBandwidth,
        taskName: taskName,
        exportFormat: ['csv', 'txt'] // Export both formats
      };

      console.log('Sending request to backend:', requestBody);

      const response = await fetch('http://localhost:3001/api/generate-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setGenerationResult(result);
        console.log('Task generation successful:', result);
        
        // Automatically download the CSV file if it was generated
        if (result.exportedFiles && result.exportedFiles.length > 0) {
          // Find the CSV file
          const csvFile = result.exportedFiles.find(file => file.endsWith('.csv'));
          if (csvFile) {
            // Create a download link for the CSV
            downloadGeneratedFile(csvFile, 'taskset.csv');
          }
        }
      } else {
        throw new Error(result.error || 'Task generation failed');
      }

    } catch (error) {
      console.error('Error generating taskset:', error);
      setError(`Failed to generate taskset: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to download generated files
  const downloadGeneratedFile = async (filePath, downloadName) => {
    try {
      // For now, we'll create a CSV content from the result data
      // In a production environment, you might want to serve the actual files
      if (generationResult && generationResult.tasks) {
        const csvContent = createCSVContent(generationResult.tasks);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', downloadName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  // Helper function to create CSV content
  const createCSVContent = (tasks) => {
    const headers = ['ID', 'Name', 'Utilization', 'Period'];
    let csvContent = headers.join(',') + '\n';
    
    tasks.forEach(task => {
      const row = [task.id, task.name, task.utilization, task.period];
      csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
  };

  return (
    <div>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: '24px'
      }}>
        Taskset Generation Parameters
      </h2>
      <p style={{
        color: '#6b7280',
        marginBottom: '32px'
      }}>
        Configure the parameters for generating the taskset based on your processed data.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Target Taskset Utilization */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Activity style={{ width: '20px', height: '20px', marginRight: '8px', color: '#2563eb' }} />
            Target Taskset Utilization
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              display: 'block',
              marginBottom: '8px'
            }}>
              Target Utilization (0.0 - 1.0)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1.0"
              value={targetUtil}
              onChange={handleTargetUtilChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            />
          </div>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            The desired overall utilization for the generated taskset PER CORE (e.g., 0.8 for 80% utilization)
          </p>
        </div>

        {/* Per-Task Utilization Range */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Database style={{ width: '20px', height: '20px', marginRight: '8px', color: '#2563eb' }} />
            Per-Task Utilization Range
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              display: 'block',
              marginBottom: '8px'
            }}>
              Minimum Utilization
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1.0"
              value={minUtil}
              onChange={handleMinUtilChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: 'white',
                marginBottom: '12px'
              }}
            />
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              display: 'block',
              marginBottom: '8px'
            }}>
              Maximum Utilization
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1.0"
              value={maxUtil}
              onChange={handleMaxUtilChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            />
          </div>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            Range for individual task utilizations (min_util should be less than max_util)
          </p>
        </div>

        {/* Number of Cores */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Cpu style={{ width: '20px', height: '20px', marginRight: '8px', color: '#2563eb' }} />
            Number of Cores
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              display: 'block',
              marginBottom: '8px'
            }}>
              Core Count (1-64)
            </label>
            <input
              type="number"
              min="1"
              max="64"
              value={numCores}
              onChange={handleNumCoresChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            />
          </div>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            The number of processor cores available for task scheduling
          </p>
        </div>

        
      </div>

      {/* Configuration Summary */}
      <div style={{
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '16px'
        }}>
          Configuration Summary
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <span style={{ fontWeight: '500', color: '#374151' }}>Target Utilization:</span>
            <span style={{ marginLeft: '8px', color: '#6b7280' }}>{(targetUtil * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span style={{ fontWeight: '500', color: '#374151' }}>Utilization Range:</span>
            <span style={{ marginLeft: '8px', color: '#6b7280' }}>
              {(minUtil * 100).toFixed(1)}% - {(maxUtil * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span style={{ fontWeight: '500', color: '#374151' }}>Cores:</span>
            <span style={{ marginLeft: '8px', color: '#6b7280' }}>{numCores}</span>
          </div>
          <div>
            <span style={{ fontWeight: '500', color: '#374151' }}>Max Partitions:</span>
            <span style={{ marginLeft: '8px', color: '#6b7280' }}>{maxPart}</span>
          </div>
          <div>
            <span style={{ fontWeight: '500', color: '#374151' }}>Max Bandwidth:</span>
            <span style={{ marginLeft: '8px', color: '#6b7280' }}>{maxBandwidth} MB/s</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '8px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              !
            </div>
            <span style={{ color: '#dc2626', fontWeight: '500' }}>
              {error}
            </span>
          </div>
        </div>
      )}

      {/* Validation Status */}
      {!isValid && !error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '8px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              !
            </div>
            <span style={{ color: '#dc2626', fontWeight: '500' }}>
              {getValidationMessage()}
            </span>
          </div>
        </div>
      )}

      {/* Success Status */}
      {isValid && !error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircle style={{
              width: '20px',
              height: '20px',
              color: '#16a34a',
              marginRight: '8px'
            }} />
            <span style={{ color: '#15803d', fontWeight: '500' }}>
              All parameters configured correctly. Ready to proceed.
            </span>
          </div>
        </div>
      )}

      {/* Generation Results */}
      {generationResult && (
        <div style={{
          padding: '24px',
          backgroundColor: '#f0fdf4',
          border: '2px solid #bbf7d0',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#15803d',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <CheckCircle style={{ width: '20px', height: '20px', marginRight: '8px' }} />
            Taskset Generation Successful!
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <span style={{ fontWeight: '500', color: '#374151' }}>Tasks Generated:</span>
              <span style={{ marginLeft: '8px', color: '#6b7280' }}>{generationResult.taskCount}</span>
            </div>
            <div>
              <span style={{ fontWeight: '500', color: '#374151' }}>Total Utilization:</span>
              <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                {(generationResult.totalUtilization * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span style={{ fontWeight: '500', color: '#374151' }}>Target Utilization:</span>
              <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                {(generationResult.targetUtilization * 100).toFixed(2)}%
              </span>
            </div>
          </div>
          
          {/* Download buttons for additional files */}
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={() => downloadGeneratedFile('csv', 'taskset.csv')}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                marginRight: '12px'
              }}
            >
              Download CSV Again
            </button>
          </div>
        </div>
      )}

      {/* Generate Button */}
      {isValid && (
        <button
          onClick={handleGenerateTaskset}
          disabled={isGenerating}
          style={{
            marginTop: '24px',
            backgroundColor: isGenerating ? '#9ca3af' : '#2563eb',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '18px',
            fontWeight: '500',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isGenerating ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '8px'
              }}></div>
              Generating Taskset...
            </>
          ) : (
            'Generate Taskset CSV'
          )}
        </button>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;