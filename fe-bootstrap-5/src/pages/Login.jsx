import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/'); // Thành công -> Về Home
    } catch (err) {
      // Xử lý logic đặc biệt theo yêu cầu: Nếu không có email -> Redirect register
      // Giả sử Backend trả về 404 hoặc message cụ thể
      if (err.response && err.response.data.error === "User not found") {
         alert("Email chưa tồn tại, chuyển hướng sang đăng ký...");
         navigate('/register');
      } else {
         setError('Đăng nhập thất bại. Vui lòng kiểm tra lại.');
      }
    }
  };

  return (
    <div className="container mt-5" style={{maxWidth: '500px'}}>
      <div className="card shadow p-4">
        <h3 className="text-center mb-3">Đăng nhập</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label>Email</label>
            <input className="form-control" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
          </div>
          <div className="mb-3">
            <label>Password</label>
            <input className="form-control" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
          </div>
          <button className="btn btn-primary w-100" type="submit">Đăng nhập</button>
        </form>
        <div className="mt-3 text-center">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}