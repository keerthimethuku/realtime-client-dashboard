import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@velozity.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: 'admin' | 'pm' | 'dev') => {
    if (role === 'admin') { setEmail('admin@velozity.com'); setPassword('admin123'); }
    else if (role === 'pm') { setEmail('pm1@velozity.com'); setPassword('pm123456'); }
    else { setEmail('dev1@velozity.com'); setPassword('dev12345'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Login Background"
          className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-6"
      >
        <Card className="border-white/10 shadow-2xl bg-card/60 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/20">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-foreground">Velozity</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">Sign in to your project workspace</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-background/50 border-white/10 h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-background/50 border-white/10 h-12"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
              <div className="text-xs text-center text-muted-foreground mt-6 space-x-2">
                <span>Demo accounts:</span>
                <button type="button" onClick={() => quickLogin('admin')} className="text-primary hover:underline">Admin</button>
                <button type="button" onClick={() => quickLogin('pm')} className="text-primary hover:underline">PM</button>
                <button type="button" onClick={() => quickLogin('dev')} className="text-primary hover:underline">Dev</button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
