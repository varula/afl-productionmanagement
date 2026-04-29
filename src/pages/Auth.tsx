import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Factory, Shield, UserCog, Users, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Allowed email domains + specific whitelisted emails
const ALLOWED_DOMAINS = ['armanabd.com', 'armanagroup.com'];
const WHITELISTED_EMAILS = ['dhnperumal@gmail.com'];

const ROLE_INFO = [
  { role: 'admin', label: 'Admin', icon: Shield, description: 'Full system access, factory & user management', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { role: 'manager', label: 'Manager / IE', icon: UserCog, description: 'Planning, analytics, reports, worker management', color: 'bg-primary/10 text-primary border-primary/30' },
  { role: 'line_chief', label: 'Line Chief', icon: Users, description: 'Hourly data entry, lost time, production plans', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  { role: 'operator', label: 'Operator', icon: Eye, description: 'View-only access to dashboard and reports', color: 'bg-muted text-muted-foreground border-border' },
];

function isAllowedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (WHITELISTED_EMAILS.includes(lower)) return true;
  const domain = lower.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}

export default function Auth() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: 'Google Sign-In Error', description: err.message, variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: 'Enter your email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Reset link sent', description: 'Check your email for the password reset link.' });
      setIsForgotPassword(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAllowedEmail(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Only authorized Armana emails or approved users can access the system.',
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
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        toast({
          title: 'Account created',
          description: 'Check your email for verification. An admin will approve your access and assign your role.',
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
            <span className="text-[14px] font-extrabold text-primary-foreground tracking-tight">AFL</span>
          </div>
          <CardTitle className="text-xl font-extrabold">Armana Productivity 360</CardTitle>
          <CardDescription className="text-xs">
            {isForgotPassword ? 'Reset your password' : isLogin ? 'Sign in to your production management system' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isForgotPassword ? (
            <>
              <form onSubmit={handleForgotPassword} className="space-y-4">
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
                </div>
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
              <div className="text-center text-sm text-muted-foreground">
                <button onClick={() => setIsForgotPassword(false)} className="text-primary font-semibold underline-offset-4 hover:underline">
                  Back to Sign In
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Google Sign-In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 h-11"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-semibold">Full Name</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Enter your full name" />
                  </div>
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
                    Authorized Armana emails & approved users only
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                    {isLogin && (
                      <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] text-primary font-medium underline-offset-4 hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                </div>

                {!isLogin && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[10px] text-muted-foreground">
                      Your account will be created with <strong>Operator</strong> (view-only) access by default.
                      An admin (<span className="font-medium text-foreground">ie@armanagroup.com</span>) will review and assign your role.
                    </p>
                  </div>
                )}

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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
