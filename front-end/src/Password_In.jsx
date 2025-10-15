import React, { useState } from 'react'; 
import { MuiOtpInput } from 'mui-one-time-password-input';

const PI = ({ onChange }) => { 
  const [otp, setOtp] = useState(''); 

  const handleChange = (newValue) => {
    setOtp(newValue);
    
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <MuiOtpInput
      value={otp}
      onChange={handleChange}
      length={4} 
      password={true}
    />
  );
};

export default PI;