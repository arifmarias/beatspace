import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { 
  MapPin, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  ArrowLeft,
  Building2,
  Users,
  Phone,
  User,
  Globe,
  FileText,
  UserPlus,
  CheckCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  contact_name: z.string().min(2, 'Contact name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  business_license: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userType, setUserType] = useState(searchParams.get('type') || 'buyer');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: userType,
    }
  });

  useEffect(() => {
    setValue('role', userType);
  }, [userType, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...data,
        role: userType,
      };
      delete submitData.confirmPassword;

      const response = await axios.post(`${API}/auth/register`, submitData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-black/40 backdrop-blur-xl border-white/20 shadow-2xl max-w-md w-full">
          <CardContent className="text-center p-8">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Registration Successful!</h2>
            <p className="text-gray-300 mb-6">
              Your account has been created and is pending admin approval. You'll receive an email notification once your account is approved.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10 mb-6"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Registration Card */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_campaign-nexus-4/artifacts/tui73r6o_BeatSpace%20Icon%20Only.png" 
                alt="BeatSpace Logo" 
                className="w-16 h-16"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Join BeatSpace
            </CardTitle>
            <p className="text-gray-400 mt-2">
              Create your account to get started
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User Type Selection */}
            <Tabs value={userType} onValueChange={setUserType} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm">
                <TabsTrigger 
                  value="buyer" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Brand/Agency
                </TabsTrigger>
                <TabsTrigger 
                  value="seller"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Advertising Agency
                </TabsTrigger>
              </TabsList>

              <TabsContent value="buyer" className="mt-4">
                <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-300">
                  <Building2 className="w-4 h-4" />
                  <AlertDescription>
                    Register as a brand or marketing agency to discover and book outdoor advertising spaces.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="seller" className="mt-4">
                <Alert className="bg-purple-500/10 border-purple-500/20 text-purple-300">
                  <Users className="w-4 h-4" />
                  <AlertDescription>
                    Register as an advertising agency to showcase your inventory and connect with brands.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Company Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Company Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Company Name *
                    </label>
                    <Input
                      placeholder="Enter company name"
                      className="bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                      {...register('company_name')}
                    />
                    {errors.company_name && (
                      <p className="text-sm text-red-400">{errors.company_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Contact Person *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        placeholder="Contact person name"
                        className="pl-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                        {...register('contact_name')}
                      />
                    </div>
                    {errors.contact_name && (
                      <p className="text-sm text-red-400">{errors.contact_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="email"
                        placeholder="company@example.com"
                        className="pl-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-400">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        placeholder="+880 1XXX-XXXXXX"
                        className="pl-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                        {...register('phone')}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-400">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Website (Optional)
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        placeholder="https://company.com"
                        className="pl-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                        {...register('website')}
                      />
                    </div>
                    {errors.website && (
                      <p className="text-sm text-red-400">{errors.website.message}</p>
                    )}
                  </div>

                  {userType === 'seller' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">
                        Business License (Optional)
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          placeholder="License document URL"
                          className="pl-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                          {...register('business_license')}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Address (Optional)
                  </label>
                  <Textarea
                    placeholder="Company address"
                    className="bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                    {...register('address')}
                  />
                </div>
              </div>

              {/* Account Security */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Lock className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Account Security</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create password"
                        className="pl-12 pr-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-400">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="password"
                        placeholder="Confirm password"
                        className="pl-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                        {...register('confirmPassword')}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Creating Account...
                    </div>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 BeatSpace. Your data is encrypted and secure.</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;