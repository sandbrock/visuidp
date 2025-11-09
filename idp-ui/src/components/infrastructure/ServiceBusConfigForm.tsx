import { AngryTextBox } from '../input';

interface ServiceBusConfigFormProps {
   
  config: Record<string, unknown>;
   
  onChange: (config: Record<string, unknown>) => void;
}

const ServiceBusConfigForm = ({ config, onChange }: ServiceBusConfigFormProps) => (
  <div className="config-form">
    <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Service Bus Configuration</h5>
    <div className="form-group">
      <AngryTextBox
        id="servicebus-cloud-service-name"
        value={(config.cloudServiceName as string) || ''}
        onChange={(v) => onChange({ ...config, cloudServiceName: v })}
        placeholder="Cloud Service Name *"
      />
    </div>
  </div>
);

export default ServiceBusConfigForm;
