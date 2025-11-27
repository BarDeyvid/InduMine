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
    <>
    <h3 style={{display: 'flex'}}>PIN</h3>
    <MuiOtpInput
      value={otp}
      onChange={handleChange}
      length={4} 
      password={true}
      TextFieldsProps={{type: 'password' }}
    />
    </>
  );
};

export default PI;