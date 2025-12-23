import axios, { AxiosInstance, CreateAxiosDefaults } from 'axios';

export function createApiClient(baseURL?: string, options?: CreateAxiosDefaults): AxiosInstance {
  return axios.create({
    baseURL: baseURL || process.env.API_URL || 'http://localhost:3001',
    timeout: parseInt(process.env.API_TIMEOUT || '5000', 10),
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
}
