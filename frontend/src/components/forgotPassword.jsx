import React, { useState } from 'react';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);

  const handleGenerateOTP = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/route/forgotpassword', { email });
      setMessage(response.data.msg);
      setStep(2); 
    } catch (error) {
      setMessage(error.response?.data?.msg || "An error occurred. Please try again.");
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/route/verifyotp', { email, otp, newPassword });
      setMessage(response.data.msg);
    } catch (error) {
      setMessage(error.response?.data?.msg || "An error occurred. Please try again.");
    }
  };

  return (
    <div>
      <h1>Forgot Password</h1>
      {step === 1 && (
        <form onSubmit={handleGenerateOTP}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Generate OTP</button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={handleUpdatePassword}>
          <label htmlFor="otp">OTP:</label>
          <input
            type="number"
            id="otp"
            name="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <label htmlFor="newPassword">New Password:</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button type="submit">Update Password</button>
        </form>
      )}
      {message && <p>{message}</p>}
    </div>
  );
};

export default ForgotPassword;