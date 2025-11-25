// src/components/Button.jsx
import styled from 'styled-components';

const Button = styled.button`
  background-color: ${props => props.theme.primary};
  color: ${props => props.theme.text};
  border: 1px solid ${props => props.theme.primary};
  padding: 10px 15px;
  border-radius: 4px;

  &:hover {
    opacity: 0.9;
  }
`;

export default Button;