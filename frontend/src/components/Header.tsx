import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";


export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="w-full bg-blue-800 text-white">
      <div className="container mx-auto px-8 py-4">
        <div className="flex justify-between items-center">
          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <h1 className="text-2xl font-bold group-hover:text-blue-200 transition-colors">
              Pho Bo System
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 focus:outline-none">
                      <Avatar className="cursor-pointer hover:opacity-80">
                        <AvatarImage src={user?.avatar} alt={user?.name || user?.email} />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {(user?.name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48" align="end">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => {
                        switch (user?.role) {
                          case "coordinator":
                            navigate('/coordinator/profile');
                            break;
                          case "mentee":
                            navigate('/mentee/profile');
                            break;
                          case "tutor":
                            navigate('/tutor/profile');
                            break;
                          default:
                            navigate('/profile');
                        }
                      }}
                    >
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                      onClick={handleLogout}
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button 
                className="px-8 py-2 text-lg bg-white text-blue-800 hover:bg-blue-50"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}