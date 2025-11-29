// UserSettings.jsx
import React from 'react';
import { Avatar, Button, TextField, Box } from '@mui/material';
import styled, { keyframes } from 'styled-components';

// Keyframes para animação (copiadas do Header.jsx)
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
`;

// Estilo para o componente de configurações
const SettingsOverlay = styled.div`
  position: fixed; 
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); 
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  
  /* Container interno centralizado */
  > div {
    background-color: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text}; /* A cor do texto principal é definida aqui */
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 700px;
    max-height: 90%;
    overflow-y: auto;
    
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    
    animation: ${({ itsclosing }) => itsclosing ? fadeOut : fadeIn} 0.3s ease-out forwards;
  }
`;

const UserSettings = React.forwardRef(({ 
    itsclosing, 
    onClose, 
    email, setEmail, 
    username, setUserName, 
    phone, setPhone, 
    birthdate, setBirthdate, 
    country, setCountry, 
    gender, setGender, 
    saveChanges 
}, ref) => {
    
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    
    return (
        <SettingsOverlay 
            itsclosing={itsclosing} 
            onClick={handleOverlayClick}
        >
            <div ref={ref}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <h1 style={{ margin: 0 }}>Configurações do Usuário</h1>
                    <Button onClick={onClose} variant="outlined">Fechar</Button>
                </Box>
                
                <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Avatar sx={{ width: 80, height: 80 }} />
                    <Button variant="contained">Trocar Foto</Button>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
                    {/* Coluna 1 */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={username}
                            onChange={(e) => setUserName(e.target.value)}
                            label="Nome Completo"
                            sx={{
                                // Estilo para o InputLabel
                                '& .MuiInputLabel-root': { color: 'inherit' },
                                // Estilo para o input (texto digitado)
                                '& .MuiOutlinedInput-input': { color: 'inherit' },
                                // Estilo para o Outline/Borda
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'inherit' },
                            }}
                        />
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            label="Telefone"
                            autoComplete="phone"
                            sx={{
                                '& .MuiInputLabel-root': { color: 'inherit' },
                                '& .MuiOutlinedInput-input': { color: 'inherit' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'inherit' },
                            }}
                        />
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={birthdate}
                            onChange={(e) => setBirthdate(e.target.value)}
                            label="Data de Nascimento"
                            autoComplete="bday"
                            sx={{
                                '& .MuiInputLabel-root': { color: 'inherit' },
                                '& .MuiOutlinedInput-input': { color: 'inherit' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'inherit' },
                            }}
                        />
                    </Box>

                    {/* Coluna 2 */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            label="Email"
                            autoComplete="email"
                            sx={{
                                '& .MuiInputLabel-root': { color: 'inherit' },
                                '& .MuiOutlinedInput-input': { color: 'inherit' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'inherit' },
                            }}
                        />
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            label="País"
                            autoComplete="country"
                            sx={{
                                '& .MuiInputLabel-root': { color: 'inherit' },
                                '& .MuiOutlinedInput-input': { color: 'inherit' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'inherit' },
                            }}
                        />
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            label="Gênero"
                            autoComplete="gender"
                            sx={{
                                '& .MuiInputLabel-root': { color: 'inherit' },
                                '& .MuiOutlinedInput-input': { color: 'inherit' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'inherit' },
                            }}
                        />
                    </Box>
                </Box>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" onClick={saveChanges}>Salvar Alterações</Button>
                </Box>
            </div>
        </SettingsOverlay>
    );
});

UserSettings.displayName = 'UserSettings';
export default UserSettings;