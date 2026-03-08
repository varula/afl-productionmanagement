import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';

export default function PendingApprovalPage() {
  const { signOut, user } = useAuth();

  return (
    <div className="fixed inset-0 app-bg-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-[0_20px_80px_rgba(30,40,100,0.15)] border-0 rounded-[22px]">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br from-amber-400 to-amber-600">
            <Clock className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-xl font-extrabold">Pending Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-2">
            <p className="text-sm text-foreground font-medium">
              Your account has been created successfully.
            </p>
            <p className="text-xs text-muted-foreground">
              An administrator needs to approve your account before you can access the system. 
              Please contact your factory admin for approval.
            </p>
          </div>

          {user?.email && (
            <p className="text-[11px] text-muted-foreground">
              Logged in as <span className="font-semibold text-foreground">{user.email}</span>
            </p>
          )}

          <Button variant="outline" onClick={signOut} className="w-full gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
