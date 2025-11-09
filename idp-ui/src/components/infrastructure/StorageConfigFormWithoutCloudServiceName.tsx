const StorageConfigFormWithoutCloudServiceName = () => (
  <div className="config-form">
    <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Storage Configuration</h5>
    
    {/* Storage-specific fields moved to cloud-specific properties */}
    {/* Region field removed as requested */}

    {/* Cloud Service Name is now handled in the main form */}
  </div>
);

export default StorageConfigFormWithoutCloudServiceName;
