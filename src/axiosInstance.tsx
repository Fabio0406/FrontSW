import axios from 'axios';

const api = axios.create({
  baseURL: 'https://backsw.up.railway.app', // URL del backend
});

export default api;
