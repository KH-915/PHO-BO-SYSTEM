import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type LoginFormInputs = {
  email: string;
  password: string;
  remember: boolean;
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string>("");
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    }
  });

  const onSubmit = (data: LoginFormInputs) => {
    setError(""); // Clear previous errors
    
    const success = login(data.email, data.password);
    
    if (success) {
      // Redirect to role selection page on successful login
      navigate("/role-selection");
    } else {
      // Show error message
      setError("Invalid email or password. Try: admin@gmail.com / 12345678");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto p-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Login to Your Account
          </h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email", { 
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register("password", { 
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters"
                  }
                })}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  {...register("remember")}
                />
                <Label htmlFor="remember" className="text-sm text-gray-700">
                  Remember me
                </Label>
              </div>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full bg-blue-800 hover:bg-blue-700" size="lg">
              Sign in
            </Button>

            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign up
              </a>
            </p>
            
            {/* <div className="text-xs text-center text-gray-500 mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <strong className="text-blue-800">Test credentials:</strong><br />
              Email: admin@gmail.com<br />
              Password: 12345678
            </div> */}
          </form>
        </Card>
      </div>
      <Footer />
    </div>
  );
}