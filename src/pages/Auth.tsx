import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Factory, Shield, UserCog, Users, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const ALLOWED_DOMAINS = ['armanabd.com', 'armanagroup.com'];

const ROLE_INFO = [
  { role: 'admin', label: 'Admin', icon: Shield, description: 'Full system access, factory & user management', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { role: 'manager', label: 'Manager / IE', icon: UserCog, description: 'Planning, analytics, reports, worker management', color: 'bg-primary/10 text-primary border-primary/30' },
  { role: 'line_chief', label: 'Line Chief', icon: Users, description: 'Hourly data entry, lost time, production plans', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  { role: 'operator', label: 'Operator', icon: Eye, description: 'View-only access to dashboard and reports', color: 'bg-muted text-muted-foreground border-border' },
];

function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('operator');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: {
          hd: 'armanabd.com', // Restrict to Armana domain
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: 'Google Sign-In Error', description: err.message, variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email domain
    if (!isAllowedDomain(email)) {
      toast({
        title: 'Invalid Email Domain',
        description: `Only @armanabd.com or @armanagroup.com emails are allowed.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, requested_role: selectedRole },
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        toast({
          title: 'Account created',
          description: 'Check your email for verification. Your role will be assigned by an admin.',
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 app-bg-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-[0_20px_80px_rgba(30,40,100,0.15)] border-0 rounded-[22px]">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-purple">
            <span className="text-[14px] font-extrabold text-primary-foreground tracking-tight">AG</span>
          </div>
          <CardTitle className="text-xl font-extrabold">Armana Fashions Limited</CardTitle>
          <CardDescription className="text-xs">
            {isLogin ? 'Sign in to your production management system' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Sign-In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 h-11"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold">Full Name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Enter your full name" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Request Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_INFO.map(r => (
                        <SelectItem key={r.role} value={r.role}>
                          <div className="flex items-center gap-2">
                            <r.icon className="h-3.5 w-3.5" />
                            <span className="font-medium">{r.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Role description */}
                  <div className="rounded-lg border border-border bg-muted/50 p-2.5">
                    {ROLE_INFO.map(r => r.role === selectedRole ? (
                      <div key={r.role} className="flex items-start gap-2">
                        <Badge variant="outline" className={`text-[9px] shrink-0 mt-0.5 ${r.color}`}>
                          {r.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{r.description}</span>
                      </div>
                    ) : null)}
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    Note: Admin will approve your role after registration. Default access is Operator (view-only).
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="you@armanabd.com" 
              />
              <p className="text-[9px] text-muted-foreground">
                Only @armanabd.com or @armanagroup.com emails allowed
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>

            {isLogin && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                <div className="text-[10px] font-semibold text-foreground mb-1.5">Role-Based Access</div>
                {ROLE_INFO.map(r => (
                  <div key={r.role} className="flex items-center gap-2">
                    <r.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${r.color}`}>{r.label}</Badge>
                    <span className="text-[9px] text-muted-foreground">{r.description}</span>
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold underline-offset-4 hover:underline">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
