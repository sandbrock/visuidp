import { AngryComboBox, AngryTextBox } from '../input';

interface RelationalDatabaseServerConfigFormProps {
   
  config: Record<string, unknown>;
   
  onChange: (config: Record<string, unknown>) => void;
}

const RelationalDatabaseServerConfigForm = ({ config, onChange }: RelationalDatabaseServerConfigFormProps) => (
  <div className="config-form">
    <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Database Server Configuration</h5>
    <div className="form-group">
      <AngryComboBox
        id="db-engine"
        items={[
          { text: 'PostgreSQL', value: 'postgres' },
          { text: 'MySQL', value: 'mysql' },
          { text: 'MariaDB', value: 'mariadb' },
          { text: 'SQL Server', value: 'sqlserver' }
        ]}
        value={(config.engine as string) || 'postgres'}
        onChange={(val) => onChange({ ...config, engine: val })}
        placeholder="Database Engine *"
      />
    </div>
    <div className="form-group">
      <AngryTextBox
        id="db-version"
        value={(config.version as string) || ''}
        onChange={(v) => onChange({ ...config, version: v })}
        placeholder="Version *"
      />
    </div>
    <div className="form-group">
      <AngryTextBox
        id="db-cloud-service-name"
        value={(config.cloudServiceName as string) || ''}
        onChange={(v) => onChange({ ...config, cloudServiceName: v })}
        placeholder="Cloud Service Name *"
      />
    </div>
  </div>
);

export default RelationalDatabaseServerConfigForm;
