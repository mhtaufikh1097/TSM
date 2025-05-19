import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Hash PIN for secure storage
export const hashPin = async (pin: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(pin, saltRounds);
};

// Verify PIN during login
export const verifyPin = async (inputPin: string, hashedPin: string): Promise<boolean> => {
  return bcrypt.compare(inputPin, hashedPin);
};

// Generate JWT token
export const generateToken = (userId: number, phoneNumber: string, fullName : string, role : string): string => {
  return jwt.sign(
    { userId, phoneNumber, fullName, role},
    JWT_SECRET,
    { expiresIn: '1d' } // Token expires in 7 days
  );
};

// Verify JWT token
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Validate phone number format
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Basic validation - can be enhanced based on your requirements
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phoneNumber);
};

// Validate PIN format
export const validatePin = (pin: string): boolean => {
  // PIN should be 6 digits
  const pinRegex = /^[0-9]{6}$/;
  return pinRegex.test(pin);
};

// Generate a random 6-digit OTP
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


export const sendOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
  // In a real application, you would integrate with an SMS provider here
  console.log(`Sending OTP ${otp} to ${phoneNumber}`);
  
  // Simulate successful sending
  return true;
};