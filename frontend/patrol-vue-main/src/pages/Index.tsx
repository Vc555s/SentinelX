import { ShieldCheck } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-600">
          SentinelX Citizen Portal
        </h1>
        <p className="text-xl text-muted-foreground">
          Stay Safe. Report Crimes. Get Real-time Alerts.
        </p>
      </div>
    </div>
  );
};

export default Index;
