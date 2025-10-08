import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/PageHeader';
import AppHeader from '@/components/AppHeader';
import { useNavigate } from 'react-router-dom';
import { addShopkeeper, changePassword, listUsers, getCurrentUser, updateUsername } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';

const Users = () => {
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [users, setUsers] = useState(listUsers());
  const [newUser, setNewUser] = useState({ username: '', name: '', password: '' });
  const [password, setPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [query, setQuery] = useState('');
  const { toast } = useToast();

  const onAdd = () => {
    if (!newUser.username || !newUser.name || !newUser.password) {
      toast({ variant: 'destructive', title: 'Please fill all fields' });
      return;
    }
    try {
      addShopkeeper(newUser.username.trim(), newUser.name.trim(), newUser.password);
      setUsers(listUsers());
      setNewUser({ username: '', name: '', password: '' });
      toast({ title: 'Shopkeeper added' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not add user', description: (e as Error).message });
    }
  };

  const onChangePassword = () => {
    if (!me) return;
    if (!password) {
      toast({ variant: 'destructive', title: 'Enter a new password' });
      return;
    }
    changePassword(me.username, password);
    setPassword('');
    toast({ title: 'Password updated' });
  };

  const onUpdateUsername = () => {
    if (!me) return;
    if (!newUsername) {
      toast({ variant: 'destructive', title: 'Enter a new username' });
      return;
    }
    try {
      updateUsername(me.username, newUsername.trim());
      setNewUsername('');
      setUsers(listUsers());
      toast({ title: 'Username updated. Please re-login if needed.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not update username', description: (e as Error).message });
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="ZES Electric Store" subtitle="User Management" />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <PageHeader title="User Management" subtitle="Add shopkeepers and update your password" onBack={() => navigate('/dashboard')} />

      <Card>
        <CardHeader>
          <CardTitle>Add Shopkeeper</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Username</Label>
              <Input placeholder="e.g. shop2" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
            </div>
            <div>
              <Label>Name</Label>
              <Input placeholder="Full name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
            </div>
            <div>
              <Label>Password</Label>
              <Input placeholder="Temporary password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            </div>
            <div className="flex items-end"><Button onClick={onAdd}>Add</Button></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Users</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search users..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.username} className="border-b last:border-0">
                    <td className="py-2 pr-4">{u.name}</td>
                    <td className="py-2 pr-4">{u.username}</td>
                    <td className="py-2 pr-4">{u.role === 'owner' ? <Badge>Owner</Badge> : <Badge variant="secondary">Shopkeeper</Badge>}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>New Username</Label>
              <Input placeholder="Update my username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            </div>
            <div className="flex items-end"><Button variant="outline" onClick={onUpdateUsername}>Update Username</Button></div>
            <div className="md:col-span-3 h-px bg-border my-2" />
            <div>
              <Label>New Password</Label>
              <Input placeholder="Enter new password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex items-end"><Button onClick={onChangePassword}>Update Password</Button></div>
          </div>
        </CardContent>
      </Card>
      </main>
    </div>
  );
};

export default Users;


