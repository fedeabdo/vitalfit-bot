import dotenv from 'dotenv';
import path from 'path';

type Environment = {
  PORT: number;
  NODE_ENV: 'development' | 'production';
  IS_PRODUCTION: boolean;
};

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validate and export
export const config: Environment = {
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: (process.env.NODE_ENV as Environment['NODE_ENV']) || 'development',
  IS_PRODUCTION: (process.env.NODE_ENV === 'production')
};