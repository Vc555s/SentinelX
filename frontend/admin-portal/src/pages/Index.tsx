import { Shield } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
          SentinelX Admin Portal
        </h1>
        <p className="text-xl text-muted-foreground">
          Crime Mapping & Predictive Policing Command Center
        </p>
      </div>
    </div>
  );
};

export default Index;
